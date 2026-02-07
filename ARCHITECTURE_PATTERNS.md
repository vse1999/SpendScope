# SpendScope Production Readiness Plan
## $10M-Grade Architecture Implementation

> **Version:** 1.0  
> **Target:** Zero-downtime, horizontally scalable, FANG-level production system  
> **Critical Success Criteria:** Zero errors, bulletproof security, <100ms P95 latency

---

## Executive Summary

This document provides a comprehensive blueprint for transforming SpendScope from a functional MVP to an enterprise-grade SaaS platform capable of handling 10M$ ARR workload. Every architectural decision is evaluated against production constraints: scalability, reliability, security, and observability.

**Current State Gaps:**
- No pagination (will fail at 10K+ records)
- No rate limiting (DDoS vulnerability)
- Basic feature gating (no race condition protection)
- No circuit breakers (cascading failure risk)
- No distributed rate limiting (Vercel Edge constraint)

**Target State:**
- Cursor-based pagination handling 1M+ records
- Multi-layer rate limiting (Edge + Application + Database)
- Atomic feature limit enforcement with optimistic locking
- Circuit breakers on all external dependencies
- 99.99% availability with automatic failover

---

## Table of Contents

1. [Feature Gating Architecture](#1-feature-gating-architecture)
2. [Pagination Strategy](#2-pagination-strategy)
3. [Rate Limiting](#3-rate-limiting)
4. [Error Handling & Resilience](#4-error-handling--resilience)
5. [Testing Strategy](#5-testing-strategy)
6. [Implementation Checklist](#6-implementation-checklist)
7. [Risk Mitigation](#7-risk-mitigation)

---

## 1. FEATURE GATING ARCHITECTURE

### 1.1 Design Philosophy

**Core Principle:** Feature limits must be enforced at multiple layers with defense-in-depth strategy. A single layer failure must not compromise limit enforcement.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENFORCEMENT LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Edge Middleware (Vercel Edge Runtime)                 │
│  ├── Fast-path rejection for obviously exceeded limits          │
│  ├── Cached limit data from Redis/KV                            │
│  └── No database round-trip (< 10ms)                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Application Service Layer                             │
│  ├── Business logic validation                                  │
│  ├── Pre-operation limit checks                                 │
│  └── Usage tracking increment                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Database (Source of Truth)                            │
│  ├── Atomic operations with row-level locking                   │
│  ├── Check constraints for hard limits                          │
│  └── Triggers for audit logging                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Decision: Optimistic Locking vs Pessimistic Locking

**Decision:** Use optimistic locking with retry for feature limit enforcement.

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Optimistic Locking** | No deadlocks, better concurrency, lower lock contention | Requires retry logic, occasional conflicts | Read-heavy, low conflict scenarios |
| **Pessimistic Locking** | Guaranteed consistency, no retries needed | Lock contention, potential deadlocks, slower | Write-heavy, high conflict scenarios |
| **Atomic Operations** | Simplest, fastest | Limited to single row, no complex logic | Counter increments only |

**Selected Approach:** Optimistic locking with version field + exponential backoff retry.

**Rationale:**
- Feature limit checks are read-heavy (check on every operation)
- Writes only happen on actual feature usage
- Conflict probability is low (< 1% at normal scale)
- Better horizontal scalability across Vercel Edge functions

### 1.3 Database Schema Enhancement

```prisma
// Add to schema.prisma

// Track usage metrics with versioning for optimistic locking
model CompanyUsage {
  id                String   @id @default(cuid())
  companyId         String   @unique
  
  // Usage counters (reset monthly)
  monthlyExpenses   Int      @default(0)
  currentMonth      Int      // YYYYMM format (202602)
  
  // Hard limits (denormalized for fast checks)
  maxExpenses       Int      @default(100)
  maxUsers          Int      @default(3)
  maxCategories     Int      @default(5)
  
  // Optimistic locking
  version           Int      @default(0)
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  company           Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@index([companyId, currentMonth])
  @@map("company_usage")
}

// Enhance Subscription model with billing period tracking
model Subscription {
  // ... existing fields ...
  
  // For grace period handling
  gracePeriodEnd    DateTime?
  
  // Soft delete / archival
  canceledAt        DateTime?
  cancelAtPeriodEnd Boolean   @default(false)
  
  // Audit
  lastSyncedAt      DateTime?
  
  @@index([status, currentPeriodEnd])
  @@index([stripeSubId])
}

// Add check constraints via migration (PostgreSQL 14+)
// These act as final safety nets
```

### 1.4 Service Layer Implementation

```typescript
// lib/subscription/feature-gate-service.ts

import { prisma } from "@/lib/prisma";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ============================================================================
// TYPES - Explicit return types for all functions
// ============================================================================

export type FeatureGateResult = 
  | { allowed: true; remaining: number }
  | { allowed: false; reason: string; upgradeUrl?: string };

export type UsageMetrics = {
  monthlyExpenses: number;
  maxExpenses: number;
  userCount: number;
  maxUsers: number;
  categoryCount: number;
  maxCategories: number;
  percentageUsed: number;
};

export type FeatureCheckOptions = {
  /** Skip cache and check database directly */
  skipCache?: boolean;
  /** Allow operation even if limit exceeded (for grace periods) */
  allowGrace?: boolean;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_LIMITS = {
  FREE: {
    maxUsers: 3,
    maxMonthlyExpenses: 100,
    maxCategories: 5,
    features: {
      analytics: false,
      export: false,
      apiAccess: false,
      webhooks: false,
    },
  },
  PRO: {
    maxUsers: Infinity,
    maxMonthlyExpenses: Infinity,
    maxCategories: Infinity,
    features: {
      analytics: true,
      export: true,
      apiAccess: true,
      webhooks: true,
    },
  },
} as const;

const CACHE_TTL_SECONDS = 60;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 50;

// ============================================================================
// REDIS CLIENT (Lazy initialization for Edge compatibility)
// ============================================================================

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if a company can perform an action that consumes a resource.
 * Implements optimistic locking with automatic retry.
 * 
 * @param companyId - The company to check
 * @param resource - The resource being consumed
 * @param options - Check options
 * @returns FeatureGateResult indicating if operation is allowed
 */
export async function checkFeatureLimit(
  companyId: string,
  resource: "expense" | "user" | "category",
  options: FeatureCheckOptions = {}
): Promise<FeatureGateResult> {
  const limitKey = resource === "expense" ? "maxExpenses" 
    : resource === "user" ? "maxUsers" 
    : "maxCategories";

  // Layer 1: Fast cache check
  if (!options.skipCache) {
    const cacheResult = await checkCacheLimit(companyId, resource);
    if (!cacheResult.allowed) return cacheResult;
  }

  // Layer 2: Database check with optimistic locking
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await checkDatabaseLimit(companyId, limitKey, options);
      
      // Update cache on successful check
      if (result.allowed) {
        await updateCacheLimit(companyId, resource, result.remaining);
      }
      
      return result;
    } catch (error) {
      if (error instanceof OptimisticLockError && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }
      throw error;
    }
  }

  // Should never reach here due to throw above
  return { allowed: false, reason: "Unable to verify limits" };
}

/**
 * Consume a resource after a successful check.
 * Must be called in same transaction as the actual operation.
 * 
 * @param tx - Prisma transaction client
 * @param companyId - The company consuming the resource
 * @param resource - The resource being consumed
 * @returns Updated usage metrics
 */
export async function consumeResource(
  tx: Prisma.TransactionClient,
  companyId: string,
  resource: "expense" | "user" | "category"
): Promise<UsageMetrics> {
  const currentMonth = getCurrentMonth();
  
  const usage = await tx.companyUsage.upsert({
    where: { companyId },
    create: {
      companyId,
      currentMonth,
      monthlyExpenses: resource === "expense" ? 1 : 0,
    },
    update: resource === "expense" ? {
      monthlyExpenses: { increment: 1 },
      version: { increment: 1 },
    } : {},
  });

  // Invalidate cache
  await invalidateCache(companyId);

  return mapToUsageMetrics(usage);
}

/**
 * Get current usage metrics for a company.
 * Includes plan limits and percentage used.
 * 
 * @param companyId - The company to get metrics for
 * @returns UsageMetrics with current and limit values
 */
export async function getUsageMetrics(companyId: string): Promise<UsageMetrics> {
  const [usage, subscription, userCount, categoryCount] = await Promise.all([
    prisma.companyUsage.findUnique({ where: { companyId } }),
    prisma.subscription.findUnique({ where: { companyId } }),
    prisma.user.count({ where: { companyId } }),
    prisma.category.count({ where: { companyId } }),
  ]);

  const plan = subscription?.plan ?? "FREE";
  const limits = FEATURE_LIMITS[plan];

  // Reset monthly counters if month changed
  const currentMonth = getCurrentMonth();
  if (usage && usage.currentMonth !== currentMonth) {
    await resetMonthlyUsage(companyId, currentMonth);
    return getUsageMetrics(companyId); // Recursive call with fresh data
  }

  const monthlyExpenses = usage?.monthlyExpenses ?? 0;
  const maxExpenses = limits.maxMonthlyExpenses as number;

  return {
    monthlyExpenses,
    maxExpenses: Number.isFinite(maxExpenses) ? maxExpenses : -1,
    userCount,
    maxUsers: limits.maxUsers as number,
    categoryCount,
    maxCategories: limits.maxCategories as number,
    percentageUsed: Number.isFinite(maxExpenses) 
      ? (monthlyExpenses / maxExpenses) * 100 
      : 0,
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

async function checkCacheLimit(
  companyId: string, 
  resource: string
): Promise<FeatureGateResult> {
  const redisClient = getRedis();
  if (!redisClient) return { allowed: true, remaining: Infinity };

  const key = `feature:${companyId}:${resource}`;
  const cached = await redisClient.get<{ remaining: number }>(key);

  if (cached && cached.remaining <= 0) {
    return { 
      allowed: false, 
      reason: `${resource} limit exceeded`,
      upgradeUrl: "/billing"
    };
  }

  return { allowed: true, remaining: cached?.remaining ?? Infinity };
}

async function checkDatabaseLimit(
  companyId: string,
  limitKey: "maxExpenses" | "maxUsers" | "maxCategories",
  options: FeatureCheckOptions
): Promise<FeatureGateResult> {
  const metrics = await getUsageMetrics(companyId);
  
  const currentValue = limitKey === "maxExpenses" ? metrics.monthlyExpenses
    : limitKey === "maxUsers" ? metrics.userCount
    : metrics.categoryCount;
  
  const maxValue = limitKey === "maxExpenses" ? metrics.maxExpenses
    : limitKey === "maxUsers" ? metrics.maxUsers
    : metrics.maxCategories;

  // Infinity check for PRO plans
  if (!Number.isFinite(maxValue) || maxValue === -1) {
    return { allowed: true, remaining: Infinity };
  }

  const remaining = maxValue - currentValue;

  if (remaining <= 0 && !options.allowGrace) {
    return {
      allowed: false,
      reason: `You have reached your ${limitKey.replace("max", "").toLowerCase()} limit. Upgrade to Pro for unlimited access.`,
      upgradeUrl: "/billing"
    };
  }

  return { allowed: true, remaining };
}

async function updateCacheLimit(
  companyId: string, 
  resource: string, 
  remaining: number
): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  const key = `feature:${companyId}:${resource}`;
  await redisClient.setex(key, CACHE_TTL_SECONDS, { remaining });
}

async function invalidateCache(companyId: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  const keys = [
    `feature:${companyId}:expense`,
    `feature:${companyId}:user`,
    `feature:${companyId}:category`,
  ];
  
  await Promise.all(keys.map(k => redisClient.del(k)));
}

function getCurrentMonth(): number {
  const now = new Date();
  return now.getFullYear() * 100 + now.getMonth() + 1; // YYYYMM format
}

async function resetMonthlyUsage(companyId: string, newMonth: number): Promise<void> {
  await prisma.companyUsage.update({
    where: { companyId },
    data: {
      monthlyExpenses: 0,
      currentMonth: newMonth,
      version: { increment: 1 },
    },
  });
}

function mapToUsageMetrics(usage: {
  monthlyExpenses: number;
  maxExpenses: number;
  maxUsers: number;
  maxCategories: number;
}): UsageMetrics {
  return {
    monthlyExpenses: usage.monthlyExpenses,
    maxExpenses: usage.maxExpenses,
    userCount: 0, // Populated separately
    maxUsers: usage.maxUsers,
    categoryCount: 0, // Populated separately
    maxCategories: usage.maxCategories,
    percentageUsed: (usage.monthlyExpenses / usage.maxExpenses) * 100,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class OptimisticLockError extends Error {
  constructor(message = "Optimistic lock conflict") {
    super(message);
    this.name = "OptimisticLockError";
  }
}
```

### 1.5 Integration with Server Actions

```typescript
// app/actions/expenses.ts - Enhanced with feature gating

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { 
  checkFeatureLimit, 
  consumeResource,
  getCurrentUserCompanyId 
} from "@/lib/subscription/feature-gate-service";
import { FeatureGateError } from "@/lib/errors";

export type CreateExpenseResult = 
  | { success: true; expense: SerializedExpense }
  | { success: false; error: string; code?: "LIMIT_EXCEEDED" | "UNAUTHORIZED" };

/**
 * Create a new expense with feature limit enforcement.
 * Uses atomic transaction to ensure limit is never exceeded.
 */
export async function createExpense(formData: FormData): Promise<CreateExpenseResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const companyId = await getCurrentUserCompanyId();
    if (!companyId) {
      return { success: false, error: "User not assigned to company" };
    }

    // STEP 1: Pre-check feature limits
    const limitCheck = await checkFeatureLimit(companyId, "expense");
    if (!limitCheck.allowed) {
      return { 
        success: false, 
        error: limitCheck.reason, 
        code: "LIMIT_EXCEEDED" 
      };
    }

    // STEP 2: Validate input
    const rawData = extractFormData(formData);
    const validation = createExpenseSchema.safeParse(rawData);
    
    if (!validation.success) {
      return { 
        success: false, 
        error: "Invalid data: " + validation.error.issues.map(i => i.message).join(", ") 
      };
    }

    // STEP 3: Atomic operation - consume resource + create expense
    const expense = await prisma.$transaction(async (tx) => {
      // Consume the resource first (will throw if limit exceeded due to race condition)
      await consumeResource(tx, companyId, "expense");
      
      // Create the expense
      return tx.expense.create({
        data: {
          amount: validation.data.amount,
          description: validation.data.description,
          date: new Date(validation.data.date),
          categoryId: validation.data.categoryId,
          userId: session.user.id,
          companyId: companyId,
        },
      });
    }, {
      // Transaction options for production
      isolationLevel: "Serializable", // Prevent phantom reads
      maxWait: 5000, // Wait max 5s for lock
      timeout: 10000, // Transaction timeout 10s
    });

    revalidatePath("/dashboard");

    return { 
      success: true, 
      expense: serializeExpense(expense) 
    };

  } catch (error) {
    console.error("[ERROR] createExpense failed:", error);
    
    if (error instanceof FeatureGateError) {
      return { 
        success: false, 
        error: error.message, 
        code: "LIMIT_EXCEEDED" 
      };
    }
    
    return { 
      success: false, 
      error: "Failed to create expense. Please try again." 
    };
  }
}
```

### 1.6 Graceful Degradation Strategy

```typescript
// lib/subscription/graceful-degradation.ts

/**
 * When external services (Redis, Stripe) are unavailable,
 * we must still serve requests safely.
 */

export type DegradationMode = "normal" | "cache_only" | "essential_only" | "read_only";

interface DegradationConfig {
  mode: DegradationMode;
  reason: string;
  fallbackLimits: {
    maxExpenses: number;
    maxUsers: number;
    maxCategories: number;
  };
}

/**
 * Determine degradation mode based on service health.
 * Called on every request to adapt to current conditions.
 */
export function getDegradationMode(): DegradationConfig {
  const redisHealthy = checkRedisHealth();
  const stripeHealthy = checkStripeHealth();
  const dbHealthy = checkDatabaseHealth();

  // Critical: Database is down
  if (!dbHealthy) {
    return {
      mode: "read_only",
      reason: "Database maintenance in progress",
      fallbackLimits: { maxExpenses: 0, maxUsers: 0, maxCategories: 0 },
    };
  }

  // Redis down but Stripe up - use stricter DB-only limits
  if (!redisHealthy && stripeHealthy) {
    return {
      mode: "cache_only",
      reason: "Caching layer unavailable",
      fallbackLimits: { maxExpenses: 50, maxUsers: 2, maxCategories: 3 },
    };
  }

  // Stripe down - allow operations but don't upgrade subscriptions
  if (!stripeHealthy) {
    return {
      mode: "essential_only",
      reason: "Billing temporarily unavailable",
      fallbackLimits: { maxExpenses: 100, maxUsers: 3, maxCategories: 5 },
    };
  }

  return {
    mode: "normal",
    reason: "All systems operational",
    fallbackLimits: { maxExpenses: Infinity, maxUsers: Infinity, maxCategories: Infinity },
  };
}
```

---

## 2. PAGINATION STRATEGY

### 2.1 Architecture Decision: Cursor vs Offset

**Decision:** Implement both cursor-based (for infinite scroll) and offset-based (for traditional pagination) with automatic strategy selection.

| Aspect | Cursor-Based | Offset-Based |
|--------|--------------|--------------|
| **Performance** | O(1) - constant time | O(n) - degrades with offset |
| **Data Consistency** | Stable - no duplicates/skips | Unstable - duplicates possible on insert |
| **Use Case** | Infinite scroll, real-time feeds | Jump to specific page, page numbers |
| **Implementation** | More complex | Simpler |
| **At 1M records** | < 50ms | > 5s (unusable) |

**Hybrid Strategy:**
- Default to cursor-based for all list queries
- Provide offset-based for admin/backoffice with warning
- Automatic fallback to cursor if offset > 10,000

### 2.2 Database Indexing Strategy

```sql
-- Essential indexes for pagination performance
-- These must be created BEFORE data grows large

-- Primary pagination index for expenses (cursor-based)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_company_date_cursor 
ON expenses(company_id, date DESC, id DESC);

-- For filtered queries (by category)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_company_category_date 
ON expenses(company_id, category_id, date DESC);

-- For user-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_company_user_date 
ON expenses(company_id, user_id, date DESC);

-- Partial index for active subscriptions only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_active 
ON subscriptions(company_id, status) 
WHERE status = 'ACTIVE';

-- For monthly usage calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_company_month 
ON expenses(company_id, date) 
WHERE date >= CURRENT_DATE - INTERVAL '1 month';

-- Covering index for list queries (includes all needed columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_list_covering 
ON expenses(company_id, date DESC, id DESC) 
INCLUDE (amount, description, category_id, user_id);
```

### 2.3 Pagination Service Implementation

```typescript
// lib/pagination/cursor-pagination.ts

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export type CursorDirection = "forward" | "backward";

export interface CursorPaginationParams {
  cursor?: string | null;
  limit: number;
  direction?: CursorDirection;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
    totalCount?: number; // Optional - expensive to compute
  };
}

export interface CursorData {
  id: string;
  date: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CURSOR_VERSION = "v1";

// ============================================================================
// CURSOR ENCODING/DECODING
// ============================================================================

/**
 * Encode cursor data to opaque string.
 * Prevents clients from manipulating cursor values.
 */
export function encodeCursor(data: CursorData): string {
  const payload = JSON.stringify({
    v: CURSOR_VERSION,
    id: data.id,
    d: data.date,
  });
  return Buffer.from(payload).toString("base64url");
}

/**
 * Decode cursor string back to data.
 * Validates version and structure.
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const payload = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(payload) as { v: string; id: string; d: string };
    
    if (parsed.v !== CURSOR_VERSION) {
      throw new Error("Invalid cursor version");
    }
    
    return { id: parsed.id, date: parsed.d };
  } catch {
    throw new Error("Invalid cursor format");
  }
}

// ============================================================================
// CORE PAGINATION FUNCTION
// ============================================================================

/**
 * Generic cursor-based pagination for Prisma models.
 * Optimized for large datasets with proper index usage.
 * 
 * @param options - Pagination parameters
 * @param baseWhere - Base where clause (companyId, etc.)
 * @param orderBy - Order configuration
 * @returns Paginated result with cursors
 */
export async function paginateWithCursor<T extends { id: string; date: Date }>(
  options: CursorPaginationParams,
  baseWhere: Prisma.ExpenseWhereInput,
  orderBy: Prisma.ExpenseOrderByWithRelationInput = { date: "desc" }
): Promise<PaginatedResult<T>> {
  const { cursor, limit, direction = "forward" } = options;
  const pageSize = Math.min(limit, MAX_PAGE_SIZE);
  
  // Fetch one extra to determine if there's a next page
  const fetchLimit = pageSize + 1;

  // Build where clause with cursor condition
  let where: Prisma.ExpenseWhereInput = { ...baseWhere };
  
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    const cursorDate = new Date(cursorData.date);
    
    if (direction === "forward") {
      // Get items BEFORE cursor (more recent for desc order)
      where = {
        ...where,
        OR: [
          { date: { gt: cursorDate } },
          { 
            date: { equals: cursorDate },
            id: { gt: cursorData.id }
          },
        ],
      };
    } else {
      // Get items AFTER cursor (older for desc order)
      where = {
        ...where,
        OR: [
          { date: { lt: cursorDate } },
          {
            date: { equals: cursorDate },
            id: { lt: cursorData.id }
          },
        ],
      };
    }
  }

  // Execute query
  const items = await prisma.expense.findMany({
    where,
    orderBy: [
      { date: direction === "forward" ? "desc" : "asc" },
      { id: direction === "forward" ? "desc" : "asc" },
    ],
    take: fetchLimit,
    include: {
      category: true,
      user: {
        select: { name: true, email: true },
      },
    },
  }) as T[];

  // Determine pagination state
  const hasMore = items.length > pageSize;
  const paginatedItems = hasMore ? items.slice(0, pageSize) : items;
  
  // Reverse if going backward
  if (direction === "backward") {
    paginatedItems.reverse();
  }

  // Generate cursors
  const startCursor = paginatedItems.length > 0 
    ? encodeCursor({ 
        id: paginatedItems[0].id, 
        date: paginatedItems[0].date.toISOString() 
      })
    : null;
    
  const endCursor = paginatedItems.length > 0
    ? encodeCursor({
        id: paginatedItems[paginatedItems.length - 1].id,
        date: paginatedItems[paginatedItems.length - 1].date.toISOString(),
      })
    : null;

  return {
    items: paginatedItems,
    pageInfo: {
      hasNextPage: direction === "forward" ? hasMore : cursor !== null,
      hasPreviousPage: direction === "backward" ? hasMore : cursor !== null,
      startCursor,
      endCursor,
    },
  };
}

// ============================================================================
// OFFSET-BASED FALLBACK (for small datasets only)
// ============================================================================

export interface OffsetPaginationParams {
  page: number;
  pageSize: number;
}

export async function paginateWithOffset<T>(
  params: OffsetPaginationParams,
  queryFn: (skip: number, take: number) => Promise<T[]>,
  countFn: () => Promise<number>
): Promise<PaginatedResult<T> & { totalPages: number }> {
  const { page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  // Warning: Offset pagination degrades at scale
  if (skip > 10000) {
    throw new Error("Offset too large. Use cursor-based pagination.");
  }

  const [items, totalCount] = await Promise.all([
    queryFn(skip, pageSize + 1),
    countFn(),
  ]);

  const hasNextPage = items.length > pageSize;
  const paginatedItems = hasNextPage ? items.slice(0, pageSize) : items;

  return {
    items: paginatedItems,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: page > 1,
      startCursor: null,
      endCursor: null,
      totalCount,
    },
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
```

### 2.4 React Component Integration

```typescript
// components/pagination/use-cursor-pagination.ts

"use client";

import { useState, useCallback, useTransition } from "react";
import type { PaginatedResult, CursorData } from "@/lib/pagination/cursor-pagination";

interface UseCursorPaginationOptions<T> {
  initialData: PaginatedResult<T>;
  fetchFn: (cursor: string | null, direction: "forward" | "backward") => Promise<PaginatedResult<T>>;
}

interface UseCursorPaginationResult<T> {
  items: T[];
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loadNextPage: () => void;
  loadPreviousPage: () => void;
  refresh: () => void;
}

export function useCursorPagination<T>(
  options: UseCursorPaginationOptions<T>
): UseCursorPaginationResult<T> {
  const { initialData, fetchFn } = options;
  const [data, setData] = useState<PaginatedResult<T>>(initialData);
  const [isPending, startTransition] = useTransition();

  const loadNextPage = useCallback(() => {
    if (!data.pageInfo.hasNextPage || !data.pageInfo.endCursor) return;
    
    startTransition(async () => {
      const newData = await fetchFn(data.pageInfo.endCursor, "forward");
      setData(newData);
    });
  }, [data.pageInfo.hasNextPage, data.pageInfo.endCursor, fetchFn]);

  const loadPreviousPage = useCallback(() => {
    if (!data.pageInfo.hasPreviousPage || !data.pageInfo.startCursor) return;
    
    startTransition(async () => {
      const newData = await fetchFn(data.pageInfo.startCursor, "backward");
      setData(newData);
    });
  }, [data.pageInfo.hasPreviousPage, data.pageInfo.startCursor, fetchFn]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const newData = await fetchFn(null, "forward");
      setData(newData);
    });
  }, [fetchFn]);

  return {
    items: data.items,
    isLoading: isPending,
    hasNextPage: data.pageInfo.hasNextPage,
    hasPreviousPage: data.pageInfo.hasPreviousPage,
    loadNextPage,
    loadPreviousPage,
    refresh,
  };
}
```

---

## 3. RATE LIMITING

### 3.1 Architecture Decision: Multi-Layer Rate Limiting

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: EDGE (Vercel Edge Middleware)                         │
│  ├── Per-IP rate limiting (DDoS protection)                     │
│  ├── Static rules, no DB dependency                             │
│  └── < 1ms response time                                        │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: APPLICATION (Server Actions / API Routes)             │
│  ├── Per-user rate limiting                                     │
│  ├── Per-endpoint limits (different for auth vs expenses)       │
│  ├── Redis-backed sliding window                                │
│  └── < 10ms response time                                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: DATABASE (Connection Pool)                            │
│  ├── Connection pool limits                                     │
│  ├── Query timeout enforcement                                  │
│  └── Resource-based throttling                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Rate Limit Configuration

```typescript
// lib/rate-limit/config.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================================
// RATE LIMIT TIERS
// ============================================================================

export const RATE_LIMITS = {
  // Authentication endpoints - strict to prevent brute force
  auth: {
    login: { requests: 5, window: "1m" },
    signup: { requests: 3, window: "1h" },
    passwordReset: { requests: 3, window: "1h" },
  },
  
  // API endpoints - moderate for normal usage
  api: {
    expenses: { requests: 100, window: "1m" },
    analytics: { requests: 30, window: "1m" },
    export: { requests: 5, window: "1m" },
    webhooks: { requests: 1000, window: "1m" }, // Stripe webhooks
  },
  
  // GraphQL/WebSocket - generous for real-time features
  realtime: {
    subscriptions: { requests: 1000, window: "1m" },
    mutations: { requests: 50, window: "1m" },
  },
} as const;

// ============================================================================
// RATELIMIT INSTANCES
// ============================================================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Sliding window algorithm - most accurate but memory intensive
export const slidingWindow = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1m"),
  analytics: true,
  prefix: "ratelimit:sliding",
});

// Fixed window - less accurate but faster and less memory
export const fixedWindow = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(100, "1m"),
  analytics: true,
  prefix: "ratelimit:fixed",
});

// Token bucket for burst handling
export const tokenBucket = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(50, "10", 100), // 50 per 10s, max burst 100
  analytics: true,
  prefix: "ratelimit:token",
});

// ============================================================================
// PER-ENDPOINT CONFIGURATION
// ============================================================================

export type RateLimitConfig = {
  limiter: Ratelimit;
  identifier: (req: Request) => string;
  onLimitExceeded?: (req: Request) => Response | Promise<Response>;
};

export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/signin": {
    limiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1m"),
      prefix: "ratelimit:auth:signin",
    }),
    identifier: (req) => `auth:${getClientIP(req)}`,
    onLimitExceeded: () => new Response(
      JSON.stringify({ error: "Too many login attempts. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    ),
  },
  
  "/api/stripe/webhooks": {
    limiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, "1m"),
      prefix: "ratelimit:webhook:stripe",
    }),
    identifier: () => "stripe:global", // Per-source, not per-request
  },
  
  "default": {
    limiter: slidingWindow,
    identifier: (req) => `api:${getClientIP(req)}:${getUserId(req)}`,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    ?? req.headers.get("x-real-ip") 
    ?? "unknown";
}

function getUserId(req: Request): string {
  // Extract from JWT or session
  return "anonymous";
}
```

### 3.3 Server Action Rate Limiting

```typescript
// lib/rate-limit/server-actions.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";

const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

interface RateLimitContext {
  userId: string;
  action: string;
  companyId?: string;
}

/**
 * Rate limit wrapper for Server Actions.
 * Combines user ID + action for per-user, per-action limits.
 */
export async function withRateLimit<T>(
  context: RateLimitContext,
  operation: () => Promise<T>,
  options: {
    requests: number;
    window: string;
    anonymousRequests?: number;
  }
): Promise<T> {
  if (!redis) {
    // Rate limiting disabled - log warning in production
    return operation();
  }

  const { userId, action } = context;
  const isAnonymous = userId === "anonymous";
  
  const limit = isAnonymous 
    ? (options.anonymousRequests ?? Math.floor(options.requests / 10))
    : options.requests;

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, options.window as `${number}m`),
    prefix: `ratelimit:action:${action}`,
  });

  const identifier = isAnonymous ? `anon:${context.companyId ?? "global"}` : `user:${userId}`;
  const { success, limit: maxLimit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    const error = new Error(`Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s.`);
    (error as Error & { code: string }).code = "RATE_LIMIT_EXCEEDED";
    (error as Error & { retryAfter: number }).retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw error;
  }

  // Execute operation
  const result = await operation();
  
  // Return rate limit headers if needed
  return result;
}

// Usage in server actions:
export async function createExpenseWithRateLimit(formData: FormData) {
  const session = await auth();
  
  return withRateLimit(
    { 
      userId: session?.user?.id ?? "anonymous", 
      action: "expense:create",
      companyId: session?.user?.companyId ?? undefined
    },
    () => createExpense(formData),
    { requests: 30, window: "1m", anonymousRequests: 0 }
  );
}
```

### 3.4 Circuit Breaker Pattern

```typescript
// lib/resilience/circuit-breaker.ts

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms
  onStateChange?: (state: CircuitState) => void;
}

interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  totalCalls: number;
  totalFailures: number;
}

/**
 * Circuit breaker implementation for external service calls.
 * Prevents cascading failures when dependencies are unhealthy.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private totalCalls = 0;
  private totalFailures = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {}

  async execute<T>(operation: () => Promise<T>, fallback?: () => T): Promise<T> {
    this.totalCalls++;

    if (this.state === "OPEN") {
      if (this.shouldAttemptReset()) {
        this.transitionTo("HALF_OPEN");
      } else {
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerError(
          `Circuit breaker '${this.name}' is OPEN`,
          this.getRetryAfter()
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo("CLOSED");
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    if (this.failures >= this.options.failureThreshold) {
      this.transitionTo("OPEN");
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.timeout;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === "CLOSED") {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === "OPEN") {
      this.successes = 0;
    }

    this.options.onStateChange?.(newState);
    
    console.log(`[CircuitBreaker:${this.name}] ${oldState} -> ${newState}`);
  }

  private getRetryAfter(): number {
    if (!this.lastFailureTime) return 0;
    const retryAfter = this.options.timeout - (Date.now() - this.lastFailureTime);
    return Math.max(0, Math.ceil(retryAfter / 1000));
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
    };
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

// Circuit breaker instances for external services
export const stripeCircuitBreaker = new CircuitBreaker("stripe", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
});

export const emailCircuitBreaker = new CircuitBreaker("email", {
  failureThreshold: 3,
  successThreshold: 1,
  timeout: 60000, // 1 minute
});
```

---

## 4. ERROR HANDLING & RESILIENCE

### 4.1 Unified Error Response Format

```typescript
// lib/errors/index.ts

// ============================================================================
// ERROR CODES - Centralized for consistency
// ============================================================================

export const ErrorCodes = {
  // Authentication errors (1000-1099)
  AUTH_UNAUTHORIZED: "AUTH_001",
  AUTH_FORBIDDEN: "AUTH_002",
  AUTH_TOKEN_EXPIRED: "AUTH_003",
  AUTH_SESSION_INVALID: "AUTH_004",
  
  // Validation errors (2000-2099)
  VALIDATION_INVALID_INPUT: "VAL_001",
  VALIDATION_MISSING_FIELD: "VAL_002",
  VALIDATION_TYPE_ERROR: "VAL_003",
  
  // Resource errors (3000-3099)
  RESOURCE_NOT_FOUND: "RES_001",
  RESOURCE_CONFLICT: "RES_002",
  RESOURCE_GONE: "RES_003",
  
  // Rate limiting (4000-4099)
  RATE_LIMIT_EXCEEDED: "RATE_001",
  RATE_LIMIT_ANONYMOUS: "RATE_002",
  
  // Feature gates (5000-5099)
  FEATURE_LIMIT_EXCEEDED: "FEAT_001",
  FEATURE_NOT_AVAILABLE: "FEAT_002",
  FEATURE_PLAN_REQUIRED: "FEAT_003",
  
  // External services (6000-6099)
  EXTERNAL_STRIPE_ERROR: "EXT_001",
  EXTERNAL_EMAIL_ERROR: "EXT_002",
  EXTERNAL_WEBHOOK_ERROR: "EXT_003",
  
  // Database errors (7000-7099)
  DB_CONNECTION_ERROR: "DB_001",
  DB_TIMEOUT: "DB_002",
  DB_CONSTRAINT_VIOLATION: "DB_003",
  
  // Circuit breaker (8000-8099)
  CIRCUIT_OPEN: "CB_001",
  
  // Generic (9000-9099)
  INTERNAL_ERROR: "INT_001",
  SERVICE_UNAVAILABLE: "INT_002",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  retryable?: boolean;
  retryAfter?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly timestamp: string;
  public readonly requestId: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details ?? {};
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.timestamp = new Date().toISOString();
    this.requestId = generateRequestId();
  }

  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: Object.keys(this.details).length > 0 ? this.details : undefined,
        retryable: this.retryable,
        retryAfter: this.retryAfter,
        requestId: this.requestId,
        timestamp: this.timestamp,
      },
    };
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

export class FeatureGateError extends AppError {
  constructor(message: string, upgradeUrl?: string) {
    super({
      code: ErrorCodes.FEATURE_LIMIT_EXCEEDED,
      message,
      statusCode: 403,
      details: upgradeUrl ? { upgradeUrl } : undefined,
    });
    this.name = "FeatureGateError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super({
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: "Rate limit exceeded. Please slow down.",
      statusCode: 429,
      retryable: true,
      retryAfter,
    });
    this.name = "RateLimitError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: ErrorCodes.VALIDATION_INVALID_INPUT,
      message,
      statusCode: 400,
      details,
    });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super({
      code: ErrorCodes.RESOURCE_NOT_FOUND,
      message: `${resource} not found${id ? `: ${id}` : ""}`,
      statusCode: 404,
    });
    this.name = "NotFoundError";
  }
}

// ============================================================================
// ERROR RESPONSE TYPE
// ============================================================================

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
    retryAfter?: number;
    requestId: string;
    timestamp: string;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// HELPERS
// ============================================================================

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 4.2 Global Error Handler

```typescript
// lib/errors/global-handler.ts

import { AppError, ErrorResponse } from "./index";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Normalize any error to standardized AppError.
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return new AppError({
      code: "VAL_001",
      message: "Validation failed",
      statusCode: 400,
      details: { issues: error.issues },
    });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError({
      code: "VAL_002",
      message: "Invalid database query",
      statusCode: 400,
    });
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError({
      code: "DB_001",
      message: "Database connection failed",
      statusCode: 503,
      retryable: true,
      retryAfter: 5,
    });
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError({
      code: "INT_001",
      message: process.env.NODE_ENV === "production" 
        ? "An unexpected error occurred" 
        : error.message,
      statusCode: 500,
    });
  }

  // Unknown error type
  return new AppError({
    code: "INT_001",
    message: "An unexpected error occurred",
    statusCode: 500,
  });
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case "P2002": // Unique constraint
      return new AppError({
        code: "DB_003",
        message: "Resource already exists",
        statusCode: 409,
        details: { fields: error.meta?.target },
      });
    
    case "P2025": // Record not found
      return new AppError({
        code: "RES_001",
        message: "Resource not found",
        statusCode: 404,
      });
    
    case "P2003": // Foreign key constraint
      return new AppError({
        code: "DB_003",
        message: "Referenced resource does not exist",
        statusCode: 400,
      });
    
    case "P2024": // Timeout
      return new AppError({
        code: "DB_002",
        message: "Database query timed out",
        statusCode: 504,
        retryable: true,
        retryAfter: 2,
      });
    
    default:
      return new AppError({
        code: "DB_001",
        message: "Database error",
        statusCode: 500,
      });
  }
}
```

### 4.3 Retry Logic with Exponential Backoff

```typescript
// lib/resilience/retry.ts

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute operation with exponential backoff retry.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (config.retryableErrors && !config.retryableErrors.includes(lastError.name)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with jitter
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      const jitteredDelay = delay * (0.5 + Math.random() * 0.5); // ±50% jitter

      config.onRetry?.(attempt, lastError, jitteredDelay);
      
      await sleep(jitteredDelay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage example:
// const result = await withRetry(
//   () => prisma.expense.create({ data }),
//   { maxAttempts: 3, retryableErrors: ["PrismaClientInitializationError"] }
// );
```

### 4.4 Dead Letter Queue for Failed Operations

```typescript
// lib/resilience/dead-letter-queue.ts

import { prisma } from "@/lib/prisma";

export type DLQJobType = 
  | "stripe_webhook"
  | "email_notification"
  | "export_generation"
  | "report_delivery";

export interface DLQJob {
  id: string;
  type: DLQJobType;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  errorStack?: string;
  scheduledAt: Date;
  createdAt: Date;
}

/**
 * Add a failed job to the dead letter queue for later retry.
 */
export async function addToDLQ(
  type: DLQJobType,
  payload: Record<string, unknown>,
  error: Error,
  maxAttempts: number = 5
): Promise<void> {
  await prisma.deadLetterQueue.create({
    data: {
      type,
      payload,
      attempts: 1,
      maxAttempts,
      errorMessage: error.message,
      errorStack: error.stack,
      scheduledAt: new Date(Date.now() + getBackoffDelay(1)),
    },
  });

  // Alert on-call if critical
  if (type === "stripe_webhook") {
    await alertCriticalFailure(`Stripe webhook failed: ${error.message}`);
  }
}

/**
 * Process jobs from the dead letter queue.
 * Called by a cron job or background worker.
 */
export async function processDLQ(batchSize: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  permanentlyFailed: number;
}> {
  const jobs = await prisma.deadLetterQueue.findMany({
    where: {
      scheduledAt: { lte: new Date() },
      attempts: { lt: prisma.deadLetterQueue.fields.maxAttempts },
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  const results = { processed: 0, succeeded: 0, failed: 0, permanentlyFailed: 0 };

  for (const job of jobs) {
    results.processed++;
    
    try {
      await executeJob(job);
      await prisma.deadLetterQueue.delete({ where: { id: job.id } });
      results.succeeded++;
    } catch (error) {
      const attempts = job.attempts + 1;
      
      if (attempts >= job.maxAttempts) {
        // Permanently failed - move to archive or alert
        await archiveFailedJob(job, error as Error);
        await prisma.deadLetterQueue.delete({ where: { id: job.id } });
        results.permanentlyFailed++;
      } else {
        // Schedule retry
        await prisma.deadLetterQueue.update({
          where: { id: job.id },
          data: {
            attempts,
            errorMessage: (error as Error).message,
            scheduledAt: new Date(Date.now() + getBackoffDelay(attempts)),
          },
        });
        results.failed++;
      }
    }
  }

  return results;
}

function getBackoffDelay(attempt: number): number {
  // Exponential backoff: 1min, 5min, 15min, 30min, 1hour
  const delays = [60000, 300000, 900000, 1800000, 3600000];
  return delays[Math.min(attempt - 1, delays.length - 1)];
}

async function executeJob(job: DLQJob): Promise<void> {
  switch (job.type) {
    case "stripe_webhook":
      // Re-process webhook
      break;
    case "email_notification":
      // Retry sending email
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function archiveFailedJob(job: DLQJob, error: Error): Promise<void> {
  // Store in long-term storage (S3, etc.)
  console.error(`[DLQ] Permanently failed job ${job.id}:`, error);
}

async function alertCriticalFailure(message: string): Promise<void> {
  // Send to PagerDuty, Opsgenie, etc.
  console.error(`[CRITICAL] ${message}`);
}
```

---

## 5. TESTING STRATEGY

### 5.1 Test Pyramid for SpendScope

```
                    /\
                   /  \
                  / E2E \          (5%) - Critical user flows
                 /─────────\         Playwright, 5-10 tests
                /───────────\
               / Integration \     (15%) - API boundaries
              /───────────────\      Vitest + MSW, 20-30 tests
             /─────────────────\
            /     Unit Tests     \  (80%) - Business logic
           /───────────────────────\   Jest/Vitest, 100+ tests
```

### 5.2 Unit Tests for Feature Gates

```typescript
// lib/subscription/__tests__/feature-gate-service.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  checkFeatureLimit, 
  consumeResource, 
  getUsageMetrics 
} from "../feature-gate-service";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    companyUsage: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    category: {
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe("Feature Gate Service", () => {
  const companyId = "company_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkFeatureLimit", () => {
    it("should allow operation when under limit", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "FREE",
        status: "ACTIVE",
      } as any);
      
      vi.mocked(prisma.companyUsage.findUnique).mockResolvedValue({
        monthlyExpenses: 50,
        maxExpenses: 100,
      } as any);

      const result = await checkFeatureLimit(companyId, "expense");

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.remaining).toBe(50);
      }
    });

    it("should deny operation when limit exceeded", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "FREE",
        status: "ACTIVE",
      } as any);
      
      vi.mocked(prisma.companyUsage.findUnique).mockResolvedValue({
        monthlyExpenses: 100,
        maxExpenses: 100,
      } as any);

      const result = await checkFeatureLimit(companyId, "expense");

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.code).toBe("LIMIT_EXCEEDED");
        expect(result.upgradeUrl).toBe("/billing");
      }
    });

    it("should allow unlimited for PRO plan", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        plan: "PRO",
        status: "ACTIVE",
      } as any);

      const result = await checkFeatureLimit(companyId, "expense");

      expect(result.allowed).toBe(true);
    });

    it("should handle race conditions with retry", async () => {
      let attempts = 0;
      vi.mocked(prisma.companyUsage.findUnique).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Deadlock detected");
        }
        return { monthlyExpenses: 10, maxExpenses: 100 } as any;
      });

      const result = await checkFeatureLimit(companyId, "expense");

      expect(result.allowed).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe("consumeResource", () => {
    it("should atomically increment usage", async () => {
      const mockTx = {
        companyUsage: {
          upsert: vi.fn().mockResolvedValue({
            monthlyExpenses: 51,
            maxExpenses: 100,
          }),
        },
      };

      await consumeResource(mockTx as any, companyId, "expense");

      expect(mockTx.companyUsage.upsert).toHaveBeenCalledWith({
        where: { companyId },
        create: expect.objectContaining({
          companyId,
          monthlyExpenses: 1,
        }),
        update: {
          monthlyExpenses: { increment: 1 },
          version: { increment: 1 },
        },
      });
    });
  });
});
```

### 5.3 Integration Tests for Stripe Webhooks

```typescript
// app/api/stripe/webhooks/__tests__/route.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST } from "../route";
import { stripe } from "@/lib/stripe/config";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Test database setup
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL!;

describe("Stripe Webhooks Integration", () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$executeRaw`TRUNCATE TABLE subscriptions CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE companies CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("checkout.session.completed", () => {
    it("should upgrade company to PRO on successful checkout", async () => {
      // Arrange
      const company = await prisma.company.create({
        data: { name: "Test Co", slug: "test-co" },
      });
      
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });

      const mockEvent = createMockStripeEvent("checkout.session.completed", {
        metadata: { companyId: company.id },
        subscription: "sub_123",
        customer: "cus_123",
      });

      // Act
      const response = await POST(createMockRequest(mockEvent));

      // Assert
      expect(response.status).toBe(200);
      
      const subscription = await prisma.subscription.findUnique({
        where: { companyId: company.id },
      });
      
      expect(subscription?.plan).toBe("PRO");
      expect(subscription?.stripeSubId).toBe("sub_123");
    });

    it("should handle missing metadata gracefully", async () => {
      const mockEvent = createMockStripeEvent("checkout.session.completed", {
        metadata: {},
        subscription: "sub_123",
      });

      const response = await POST(createMockRequest(mockEvent));

      expect(response.status).toBe(200); // Acknowledge webhook
      // Should log error but not crash
    });

    it("should be idempotent for duplicate events", async () => {
      const company = await prisma.company.create({
        data: { name: "Test Co 2", slug: "test-co-2" },
      });
      
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });

      const mockEvent = createMockStripeEvent("checkout.session.completed", {
        id: "evt_duplicate", // Same event ID
        metadata: { companyId: company.id },
        subscription: "sub_123",
      });

      // Process twice
      await POST(createMockRequest(mockEvent));
      await POST(createMockRequest(mockEvent));

      const subscription = await prisma.subscription.findUnique({
        where: { companyId: company.id },
      });
      
      expect(subscription?.plan).toBe("PRO");
      // Should not create duplicate records or fail
    });
  });

  describe("invoice.payment_failed", () => {
    it("should mark subscription as past_due", async () => {
      const company = await prisma.company.create({
        data: { name: "Test Co 3", slug: "test-co-3" },
      });
      
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          plan: "PRO",
          status: "ACTIVE",
          stripeSubId: "sub_failed",
        },
      });

      const mockEvent = createMockStripeEvent("invoice.payment_failed", {
        subscription: "sub_failed",
      });

      await POST(createMockRequest(mockEvent));

      const subscription = await prisma.subscription.findUnique({
        where: { companyId: company.id },
      });
      
      expect(subscription?.status).toBe("PAST_DUE");
    });
  });
});

// Test helpers
function createMockStripeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    object: "event",
    api_version: "2024-01-01",
    created: Date.now(),
    type,
    data: { object: data as any },
  } as Stripe.Event;
}

function createMockRequest(event: Stripe.Event): Request {
  return new Request("http://localhost/api/stripe/webhooks", {
    method: "POST",
    headers: {
      "stripe-signature": "test_signature",
    },
    body: JSON.stringify(event),
  });
}
```

### 5.4 Load Testing for Pagination

```typescript
// tests/load/pagination-load.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import { paginateWithCursor } from "@/lib/pagination/cursor-pagination";
import { prisma } from "@/lib/prisma";

const LOAD_TEST_COMPANY_ID = "load-test-company";
const RECORD_COUNTS = [1000, 10000, 100000, 1000000];

describe("Pagination Load Tests", () => {
  beforeAll(async () => {
    // Setup: Generate test data if not exists
    const existingCount = await prisma.expense.count({
      where: { companyId: LOAD_TEST_COMPANY_ID },
    });

    if (existingCount < 1000000) {
      console.log("Generating test data...");
      await generateTestData(1000000 - existingCount);
    }
  });

  describe("Cursor-based pagination performance", () => {
    it.each(RECORD_COUNTS)("should paginate %i records under 50ms", async (count) => {
      const startTime = performance.now();

      const result = await paginateWithCursor(
        { limit: 20, cursor: null },
        { companyId: LOAD_TEST_COMPANY_ID }
      );

      const duration = performance.now() - startTime;

      expect(result.items).toHaveLength(20);
      expect(duration).toBeLessThan(50);
    });

    it("should maintain performance at deep pagination", async () => {
      // Get cursor at 500k records
      const deepCursor = await getCursorAtOffset(LOAD_TEST_COMPANY_ID, 500000);

      const startTime = performance.now();

      const result = await paginateWithCursor(
        { limit: 20, cursor: deepCursor },
        { companyId: LOAD_TEST_COMPANY_ID }
      );

      const duration = performance.now() - startTime;

      expect(result.items).toHaveLength(20);
      expect(duration).toBeLessThan(50); // Should still be fast
    });
  });

  describe("Concurrent load", () => {
    it("should handle 100 concurrent pagination requests", async () => {
      const requests = Array.from({ length: 100 }, (_, i) => 
        paginateWithCursor(
          { limit: 20, cursor: null },
          { companyId: LOAD_TEST_COMPANY_ID }
        )
      );

      const startTime = performance.now();
      const results = await Promise.all(requests);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(2000); // All under 2 seconds
      
      // All should return valid data
      results.forEach(r => {
        expect(r.items.length).toBeGreaterThan(0);
        expect(r.pageInfo).toBeDefined();
      });
    });
  });
});

async function generateTestData(count: number): Promise<void> {
  const batchSize = 1000;
  const batches = Math.ceil(count / batchSize);

  for (let i = 0; i < batches; i++) {
    const expenses = Array.from({ length: Math.min(batchSize, count - i * batchSize) }, (_, j) => ({
      amount: Math.random() * 1000,
      description: `Test expense ${i * batchSize + j}`,
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      categoryId: "test-category",
      userId: "test-user",
      companyId: LOAD_TEST_COMPANY_ID,
    }));

    await prisma.expense.createMany({
      data: expenses,
      skipDuplicates: true,
    });

    if (i % 10 === 0) {
      console.log(`Generated ${(i + 1) * batchSize} records...`);
    }
  }
}

async function getCursorAtOffset(companyId: string, offset: number): Promise<string> {
  const record = await prisma.expense.findFirst({
    where: { companyId },
    orderBy: { date: "desc" },
    skip: offset,
    select: { id: true, date: true },
  });

  if (!record) throw new Error("Offset exceeds record count");

  return encodeCursor({ id: record.id, date: record.date.toISOString() });
}
```

### 5.5 Chaos Engineering Principles

```typescript
// tests/chaos/chaos-engineering.test.ts

import { describe, it, expect, beforeEach } from "vitest";

/**
 * Chaos Engineering Test Suite
 * 
 * These tests intentionally introduce failures to verify system resilience.
 * Run in isolated environment, never in production.
 */

describe("Chaos Engineering", () => {
  describe("Database failures", () => {
    it("should handle connection pool exhaustion", async () => {
      // Simulate connection pool exhaustion
      const promises = Array.from({ length: 1000 }, () => 
        prisma.expense.findMany({ take: 1 })
      );

      // Should queue requests, not crash
      const results = await Promise.allSettled(promises);
      const failures = results.filter(r => r.status === "rejected");
      
      // Some may fail, but system should recover
      expect(failures.length).toBeLessThan(100);
    });

    it("should handle query timeout", async () => {
      // Force a slow query
      const slowQuery = prisma.$queryRaw`
        SELECT pg_sleep(10), * FROM expenses LIMIT 1
      `;

      const result = await Promise.race([
        slowQuery,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);

      // Should timeout gracefully
      expect(result).toBeUndefined();
    });
  });

  describe("External service failures", () => {
    it("should degrade gracefully when Redis is unavailable", async () => {
      // Temporarily disable Redis
      process.env.UPSTASH_REDIS_REST_URL = "";

      // Feature gating should still work (fallback to DB)
      const result = await checkFeatureLimit("company_123", "expense");
      
      expect(result.allowed).toBeDefined();
    });

    it("should circuit break on Stripe API failures", async () => {
      // Simulate Stripe API down
      vi.spyOn(stripe.subscriptions, "list").mockRejectedValue(
        new Error("Stripe API unavailable")
      );

      // Multiple failures should open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await getCompanySubscription("company_123");
        } catch {
          // Expected
        }
      }

      // Circuit should now be open
      const metrics = stripeCircuitBreaker.getMetrics();
      expect(metrics.state).toBe("OPEN");
    });
  });

  describe("Network partitions", () => {
    it("should handle partial network failures", async () => {
      // Simulate partial connectivity
      const results = await Promise.allSettled([
        // DB query (local - should work)
        prisma.expense.count(),
        
        // External API call (may fail)
        fetch("https://api.stripe.com/v1/health"),
      ]);

      // DB should succeed even if external fails
      expect(results[0].status).toBe("fulfilled");
    });
  });
});
```

---

## 6. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Week 1)

#### Database Layer
- [ ] Add `CompanyUsage` table migration
- [ ] Create database indexes for pagination
- [ ] Add check constraints for hard limits
- [ ] Set up database connection pooling limits

#### Feature Gating
- [ ] Implement `feature-gate-service.ts`
- [ ] Add optimistic locking with version field
- [ ] Integrate with Redis for caching
- [ ] Update all create operations to check limits

#### Error Handling
- [ ] Create unified error classes
- [ ] Implement global error handler
- [ ] Add request ID generation
- [ ] Standardize error responses

### Phase 2: Performance & Scale (Week 2)

#### Pagination
- [ ] Implement cursor-based pagination service
- [ ] Update expense list to use cursor pagination
- [ ] Add infinite scroll component
- [ ] Create pagination UI components

#### Rate Limiting
- [ ] Set Upstash Redis account
- [ ] Implement Edge middleware rate limiting
- [ ] Add Server Action rate limiting
- [ ] Configure per-endpoint limits

#### Resilience
- [ ] Implement circuit breakers
- [ ] Add retry logic with exponential backoff
- [ ] Create dead letter queue table
- [ ] Add DLQ processor cron job

### Phase 3: Testing & Observability (Week 3)

#### Testing
- [ ] Write unit tests for feature gates
- [ ] Create integration tests for webhooks
- [ ] Set up load testing environment
- [ ] Implement chaos engineering tests

#### Monitoring
- [ ] Add OpenTelemetry instrumentation
- [ ] Set up Sentry error tracking
- [ ] Configure Vercel Analytics
- [ ] Create alerting rules

### Phase 4: Security Hardening (Week 4)

- [ ] Add Content Security Policy headers
- [ ] Implement audit logging
- [ ] Add request signing for webhooks
- [ ] Perform security audit

---

## 7. RISK MITIGATION

### Critical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Race condition allows limit bypass** | High | Medium | Optimistic locking + database constraints |
| **Pagination fails at 1M+ records** | High | Low | Cursor-based + proper indexes |
| **Rate limiting doesn't scale** | High | Medium | Redis cluster + Edge caching |
| **Circuit breaker causes outage** | Medium | Low | Half-open state + manual override |
| **Webhook processing fails silently** | High | Medium | DLQ + alerting + idempotency |
| **Data leak between tenants** | Critical | Low | Row-level security + query audit |

### Rollback Strategy

For each change, maintain backward compatibility:

1. **Database Migrations**: Add nullable columns first, populate, then enforce
2. **Feature Flags**: Use LaunchDarkly or similar for instant rollback
3. **Blue-Green Deployment**: Keep previous version running for 24h
4. **Database Backups**: Hourly snapshots during deployment window

### Incident Response

```
SEV 1 (Critical): Service down, data loss
├── Response time: 15 minutes
├── Actions: Page on-call, enable maintenance mode, restore from backup
└── Communication: CEO, all customers via status page

SEV 2 (High): Major feature broken, security incident
├── Response time: 1 hour
├── Actions: Rollback feature flag, investigate scope
└── Communication: Engineering lead, affected customers

SEV 3 (Medium): Performance degradation, minor bug
├── Response time: 4 hours
├── Actions: Add to sprint, deploy at next window
└── Communication: Support team
```

---

## Appendix A: Monitoring & Observability

### Key Metrics to Track

```typescript
// lib/observability/metrics.ts

export const METRICS = {
  // Business metrics
  ACTIVE_USERS: "business.active_users",
  MONTHLY_EXPENSES: "business.monthly_expenses",
  CONVERSION_RATE: "business.conversion_rate",
  
  // Performance metrics
  API_LATENCY_P95: "perf.api_latency_p95",
  DB_QUERY_TIME: "perf.db_query_time",
  CACHE_HIT_RATE: "perf.cache_hit_rate",
  
  // Reliability metrics
  ERROR_RATE: "reliability.error_rate",
  UPTIME: "reliability.uptime",
  DLQ_DEPTH: "reliability.dlq_depth",
  
  // Security metrics
  AUTH_FAILURES: "security.auth_failures",
  RATE_LIMIT_HITS: "security.rate_limit_hits",
  SUSPICIOUS_ACTIVITY: "security.suspicious_activity",
} as const;
```

### Alerting Rules

```yaml
# alerts.yml
rules:
  - name: HighErrorRate
    condition: error_rate > 1%
    duration: 5m
    severity: critical
    
  - name: SlowAPI
    condition: api_latency_p95 > 500ms
    duration: 10m
    severity: warning
    
  - name: DatabaseConnections
    condition: db_connections > 80%
    duration: 2m
    severity: critical
    
  - name: DLQGrowing
    condition: dlq_depth > 100
    duration: 15m
    severity: warning
```

---

## Conclusion

This implementation plan transforms SpendScope from an MVP to a production-grade SaaS platform capable of handling millions in ARR. The key architectural decisions—optimistic locking for feature gates, cursor-based pagination, multi-layer rate limiting, and circuit breakers—provide the foundation for horizontal scalability and 99.99% uptime.

**Success Metrics:**
- P95 API latency < 100ms
- Zero data leaks between tenants
- 99.99% uptime
- < 1% error rate
- Handle 1M+ records without degradation

**Next Steps:**
1. Review this plan with engineering team
2. Set up staging environment for load testing
3. Begin Phase 1 implementation
4. Schedule weekly architecture review meetings

---

*Document Version: 1.0*  
*Last Updated: 2026-02-06*  
*Author: Principal Software Architect*  
*Classification: Engineering Internal*
