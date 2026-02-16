/**
 * Custom error classes for SpendScope
 * Following strict TypeScript standards - no `any` types allowed
 */

/**
 * Base application error with structured metadata
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly metadata: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      metadata: this.metadata,
    };
  }
}

/**
 * Error thrown when a feature limit is exceeded
 */
export class FeatureGateError extends AppError {
  public readonly feature: string;
  public readonly limit: number;
  public readonly current: number;
  public readonly upgradeUrl: string;

  constructor(
    message: string,
    feature: string,
    limit: number,
    current: number,
    upgradeUrl: string = "/dashboard/billing"
  ) {
    super(
      message,
      "FEATURE_LIMIT_EXCEEDED",
      403,
      { feature, limit, current, upgradeUrl }
    );
    this.feature = feature;
    this.limit = limit;
    this.current = current;
    this.upgradeUrl = upgradeUrl;
  }
}

/**
 * Error thrown when optimistic locking fails due to concurrent modification
 */
export class OptimisticLockError extends AppError {
  public readonly entity: string;
  public readonly entityId: string;
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(
    entity: string,
    entityId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    super(
      `Concurrent modification detected on ${entity} (${entityId}). Expected version ${expectedVersion}, but found ${actualVersion}.`,
      "OPTIMISTIC_LOCK_CONFLICT",
      409,
      { entity, entityId, expectedVersion, actualVersion }
    );
    this.entity = entity;
    this.entityId = entityId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Error thrown when cache operations fail
 */
export class CacheError extends AppError {
  public readonly operation: string;

  constructor(operation: string, originalError?: Error) {
    super(
      `Cache ${operation} failed: ${originalError?.message ?? "Unknown error"}`,
      "CACHE_ERROR",
      503,
      { operation, originalError: originalError?.message }
    );
    this.operation = operation;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  public readonly field: string;
  public readonly value: unknown;

  constructor(field: string, value: unknown, message: string) {
    super(
      message,
      "VALIDATION_ERROR",
      400,
      { field, value }
    );
    this.field = field;
    this.value = value;
  }
}
