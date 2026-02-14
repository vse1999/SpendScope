import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_POLICY_THRESHOLD_USD = 1000;

export interface ExpensePolicyRule {
  id: string;
  companyId: string;
  scopeType: "GLOBAL" | "CATEGORY";
  categoryId: string | null;
  thresholdUsd: number;
  requiresReceiptAboveUsd: number | null;
  active: boolean;
  version: number;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PolicyRow {
  id: string;
  company_id: string;
  scope_type: "GLOBAL" | "CATEGORY";
  category_id: string | null;
  threshold_usd: Prisma.Decimal;
  requires_receipt_above_usd: Prisma.Decimal | null;
  active: boolean;
  version: number;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExpensePolicyConfig {
  globalThresholdUsd: number;
  globalRequiresReceiptAboveUsd: number | null;
  categoryThresholds: Record<string, number>;
}

function mapRow(row: PolicyRow): ExpensePolicyRule {
  return {
    id: row.id,
    companyId: row.company_id,
    scopeType: row.scope_type,
    categoryId: row.category_id,
    thresholdUsd: Number(row.threshold_usd),
    requiresReceiptAboveUsd: row.requires_receipt_above_usd ? Number(row.requires_receipt_above_usd) : null,
    active: row.active,
    version: row.version,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listExpensePolicyRules(companyId: string): Promise<ExpensePolicyRule[]> {
  const rows = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
    SELECT *
    FROM expense_policy_rules
    WHERE company_id = ${companyId} AND active = TRUE
    ORDER BY scope_type ASC, created_at DESC
  `);

  return rows.map(mapRow);
}

export async function getExpensePolicyConfig(companyId: string): Promise<ExpensePolicyConfig> {
  const rules = await listExpensePolicyRules(companyId);

  const globalRule = rules.find((rule) => rule.scopeType === "GLOBAL");
  const categoryThresholds: Record<string, number> = {};
  for (const rule of rules) {
    if (rule.scopeType === "CATEGORY" && rule.categoryId) {
      categoryThresholds[rule.categoryId] = rule.thresholdUsd;
    }
  }

  return {
    globalThresholdUsd: globalRule?.thresholdUsd ?? DEFAULT_POLICY_THRESHOLD_USD,
    globalRequiresReceiptAboveUsd: globalRule?.requiresReceiptAboveUsd ?? null,
    categoryThresholds,
  };
}

export async function upsertGlobalExpensePolicyRule(
  companyId: string,
  thresholdUsd: number,
  requiresReceiptAboveUsd: number | null,
  updatedBy: string
): Promise<ExpensePolicyRule> {
  const existing = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
    SELECT *
    FROM expense_policy_rules
    WHERE company_id = ${companyId}
      AND scope_type = 'GLOBAL'
      AND active = TRUE
    LIMIT 1
  `);

  let rows: PolicyRow[];
  if (existing.length > 0) {
    rows = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
      UPDATE expense_policy_rules
      SET
        threshold_usd = ${thresholdUsd},
        requires_receipt_above_usd = ${requiresReceiptAboveUsd},
        version = version + 1,
        updated_by = ${updatedBy},
        updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING *
    `);
  } else {
    const id = randomUUID();
    rows = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
      INSERT INTO expense_policy_rules (
        id, company_id, scope_type, category_id, threshold_usd,
        requires_receipt_above_usd, active, version, updated_by, created_at, updated_at
      )
      VALUES (
        ${id}, ${companyId}, 'GLOBAL', NULL, ${thresholdUsd},
        ${requiresReceiptAboveUsd}, TRUE, 1, ${updatedBy}, NOW(), NOW()
      )
      RETURNING *
    `);
  }

  if (rows.length === 0) {
    throw new Error("Failed to save global expense policy");
  }

  return mapRow(rows[0]);
}

export async function upsertCategoryExpensePolicyRule(
  companyId: string,
  categoryId: string,
  thresholdUsd: number,
  requiresReceiptAboveUsd: number | null,
  updatedBy: string
): Promise<ExpensePolicyRule> {
  const existing = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
    SELECT *
    FROM expense_policy_rules
    WHERE company_id = ${companyId}
      AND scope_type = 'CATEGORY'
      AND category_id = ${categoryId}
      AND active = TRUE
    LIMIT 1
  `);

  let rows: PolicyRow[];
  if (existing.length > 0) {
    rows = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
      UPDATE expense_policy_rules
      SET
        threshold_usd = ${thresholdUsd},
        requires_receipt_above_usd = ${requiresReceiptAboveUsd},
        version = version + 1,
        updated_by = ${updatedBy},
        updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING *
    `);
  } else {
    const id = randomUUID();
    rows = await prisma.$queryRaw<PolicyRow[]>(Prisma.sql`
      INSERT INTO expense_policy_rules (
        id, company_id, scope_type, category_id, threshold_usd,
        requires_receipt_above_usd, active, version, updated_by, created_at, updated_at
      )
      VALUES (
        ${id}, ${companyId}, 'CATEGORY', ${categoryId}, ${thresholdUsd},
        ${requiresReceiptAboveUsd}, TRUE, 1, ${updatedBy}, NOW(), NOW()
      )
      RETURNING *
    `);
  }

  if (rows.length === 0) {
    throw new Error("Failed to save category expense policy");
  }

  return mapRow(rows[0]);
}

export async function deleteCategoryExpensePolicyRule(
  companyId: string,
  categoryId: string
): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM expense_policy_rules
    WHERE company_id = ${companyId}
      AND scope_type = 'CATEGORY'
      AND category_id = ${categoryId}
      AND active = TRUE
  `);
}
