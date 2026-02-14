import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type {
  CopilotAdviceRecord,
  CopilotAdviceRequestContext,
  CopilotAdviceStatus,
  CopilotAdviceType,
} from "@/lib/expenses/copilot-ai-contracts";
import { validateAdvicePayload } from "@/lib/expenses/copilot-ai-contracts";

const ADVICE_MODEL_DEFAULT = "rules-fallback-v1";
const PROMPT_VERSION = "expense-copilot-v1";
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RETRIES = 1;
const FAILURE_OPEN_CIRCUIT_COUNT = 3;
const CIRCUIT_OPEN_MS = 30000;

interface ProviderResponse {
  payload: unknown;
  confidence: number;
  explanation?: string;
  recommendation?: string;
  model: string;
  tokenUsage?: number;
}

export interface CopilotAIProvider {
  generate(
    adviceType: CopilotAdviceType,
    request: CopilotAdviceRequestContext
  ): Promise<ProviderResponse>;
}

interface CopilotAIRepository {
  upsert(record: {
    alertId: string;
    expenseId: string;
    companyId: string;
    adviceType: CopilotAdviceType;
    status: CopilotAdviceStatus;
    model: string;
    confidence: number | null;
    explanation: string | null;
    recommendation: string | null;
    payloadJson: string | null;
    inputHash: string;
    latencyMs: number | null;
    tokenUsage: number | null;
    errorMessage: string | null;
  }): Promise<CopilotAdviceRecord>;
}

type AdviceRow = {
  id: string;
  alert_id: string;
  expense_id: string;
  company_id: string;
  advice_type: string;
  status: string;
  model: string;
  prompt_version: string;
  confidence: number | null;
  explanation: string | null;
  recommendation: string | null;
  payload_json: string | null;
  input_hash: string;
  latency_ms: number | null;
  token_usage: number | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapAdviceRow(row: AdviceRow): CopilotAdviceRecord {
  return {
    id: row.id,
    alertId: row.alert_id,
    expenseId: row.expense_id,
    companyId: row.company_id,
    adviceType: row.advice_type as CopilotAdviceType,
    status: row.status as CopilotAdviceStatus,
    model: row.model,
    promptVersion: row.prompt_version,
    confidence: row.confidence,
    explanation: row.explanation,
    recommendation: row.recommendation,
    payloadJson: row.payload_json,
    inputHash: row.input_hash,
    latencyMs: row.latency_ms,
    tokenUsage: row.token_usage,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class PrismaCopilotAIRepository implements CopilotAIRepository {
  async upsert(record: {
    alertId: string;
    expenseId: string;
    companyId: string;
    adviceType: CopilotAdviceType;
    status: CopilotAdviceStatus;
    model: string;
    confidence: number | null;
    explanation: string | null;
    recommendation: string | null;
    payloadJson: string | null;
    inputHash: string;
    latencyMs: number | null;
    tokenUsage: number | null;
    errorMessage: string | null;
  }): Promise<CopilotAdviceRecord> {
    const { prisma } = await import("@/lib/prisma");
    const id = randomUUID();
    const result = await prisma.$queryRaw<AdviceRow[]>(Prisma.sql`
      INSERT INTO copilot_ai_advice (
        id, alert_id, expense_id, company_id, advice_type, status, model, prompt_version,
        confidence, explanation, recommendation, payload_json, input_hash, latency_ms,
        token_usage, error_message, created_at, updated_at
      )
      VALUES (
        ${id}, ${record.alertId}, ${record.expenseId}, ${record.companyId}, ${record.adviceType},
        ${record.status}, ${record.model}, ${PROMPT_VERSION},
        ${record.confidence}, ${record.explanation}, ${record.recommendation}, ${record.payloadJson},
        ${record.inputHash}, ${record.latencyMs}, ${record.tokenUsage}, ${record.errorMessage},
        NOW(), NOW()
      )
      ON CONFLICT (alert_id, advice_type)
      DO UPDATE SET
        status = EXCLUDED.status,
        model = EXCLUDED.model,
        prompt_version = EXCLUDED.prompt_version,
        confidence = EXCLUDED.confidence,
        explanation = EXCLUDED.explanation,
        recommendation = EXCLUDED.recommendation,
        payload_json = EXCLUDED.payload_json,
        input_hash = EXCLUDED.input_hash,
        latency_ms = EXCLUDED.latency_ms,
        token_usage = EXCLUDED.token_usage,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()
      RETURNING *
    `);

    if (result.length === 0) {
      throw new Error("Failed to persist copilot AI advice");
    }

    return mapAdviceRow(result[0]);
  }
}

class RuleFallbackProvider implements CopilotAIProvider {
  async generate(
    adviceType: CopilotAdviceType,
    request: CopilotAdviceRequestContext
  ): Promise<ProviderResponse> {
    if (adviceType === "triage_priority") {
      return {
        model: ADVICE_MODEL_DEFAULT,
        confidence: 0.7,
        recommendation: request.severity >= 85 ? "ESCALATE" : "REQUEST_RECEIPT",
        payload: {
          priorityScore: request.severity,
          impactLevel:
            request.severity >= 90
              ? "CRITICAL"
              : request.severity >= 75
                ? "HIGH"
                : request.severity >= 60
                  ? "MEDIUM"
                  : "LOW",
          urgencyReason: `Severity ${request.severity} with ${Math.round(request.confidence * 100)}% detector confidence.`,
        },
      };
    }

    if (adviceType === "policy_suggestion") {
      return {
        model: ADVICE_MODEL_DEFAULT,
        confidence: 0.65,
        payload: {
          categoryName: request.categoryName,
          currentThresholdUsd: 1000,
          suggestedThresholdUsd: request.amount > 1400 ? 1200 : 1000,
          rationale: "Review repeated high-value alerts in this category before changing policy.",
        },
      };
    }

    return {
      model: ADVICE_MODEL_DEFAULT,
      confidence: 0.75,
      recommendation: request.ruleType === "DUPLICATE" ? "FALSE_ALARM" : "REQUEST_RECEIPT",
      explanation: `Generated from deterministic alert context for ${request.ruleType}.`,
      payload: {
        summary: `${request.ruleType} alert for ${request.userDisplayName} on ${request.expenseDescription}.`,
        rationaleBullets: [
          request.reason,
          `Amount ${request.amount.toFixed(2)} in ${request.categoryName}.`,
        ],
        recommendedAction:
          request.ruleType === "POLICY_BREACH"
            ? "REQUEST_RECEIPT"
            : request.ruleType === "DUPLICATE"
              ? "FALSE_ALARM"
              : "MARK_VALID",
      },
    };
  }
}

const OpenAIResponseSchema = z.object({
  payload: z.unknown(),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
  recommendation: z.string().optional(),
  model: z.string().min(1),
  tokenUsage: z.number().int().nonnegative().optional(),
});

class OpenAIHTTPProvider implements CopilotAIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(
    adviceType: CopilotAdviceType,
    request: CopilotAdviceRequestContext
  ): Promise<ProviderResponse> {
    const prompt = [
      `You are a finance copilot. Return compact strict JSON only.`,
      `Advice type: ${adviceType}`,
      `Alert context: ${JSON.stringify(request)}`,
      `Return keys: payload, confidence, explanation, recommendation, model, tokenUsage`,
    ].join("\n");

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed with status ${response.status}`);
    }

    const json = await response.json();
    const parsed = OpenAIResponseSchema.parse(json);
    return parsed;
  }
}

interface CircuitState {
  failures: number;
  openUntilMs: number | null;
}

function createInputHash(request: CopilotAdviceRequestContext): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI request timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class ExpenseCopilotAIService {
  private readonly repository: CopilotAIRepository;
  private readonly provider: CopilotAIProvider;
  private readonly circuit: CircuitState = { failures: 0, openUntilMs: null };

  constructor(repository: CopilotAIRepository, provider: CopilotAIProvider) {
    this.repository = repository;
    this.provider = provider;
  }

  async generateAndStore(
    adviceType: CopilotAdviceType,
    request: CopilotAdviceRequestContext
  ): Promise<CopilotAdviceRecord> {
    const start = Date.now();
    const inputHash = createInputHash(request);

    if (this.circuit.openUntilMs !== null && Date.now() < this.circuit.openUntilMs) {
      return this.repository.upsert({
        alertId: request.alertId,
        expenseId: request.expenseId,
        companyId: request.companyId,
        adviceType,
        status: "FAILED",
        model: ADVICE_MODEL_DEFAULT,
        confidence: null,
        explanation: null,
        recommendation: null,
        payloadJson: null,
        inputHash,
        latencyMs: 0,
        tokenUsage: null,
        errorMessage: "Circuit breaker open",
      });
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const providerResponse = await withTimeout(
          this.provider.generate(adviceType, request),
          REQUEST_TIMEOUT_MS
        );
        const payload = validateAdvicePayload(adviceType, providerResponse.payload);
        const latencyMs = Date.now() - start;

        this.circuit.failures = 0;
        this.circuit.openUntilMs = null;

        return this.repository.upsert({
          alertId: request.alertId,
          expenseId: request.expenseId,
          companyId: request.companyId,
          adviceType,
          status: "READY",
          model: providerResponse.model,
          confidence: providerResponse.confidence,
          explanation: providerResponse.explanation ?? null,
          recommendation: providerResponse.recommendation ?? null,
          payloadJson: JSON.stringify(payload),
          inputHash,
          latencyMs,
          tokenUsage: providerResponse.tokenUsage ?? null,
          errorMessage: null,
        });
      } catch (error) {
        lastError = error;
      }
    }

    this.circuit.failures += 1;
    if (this.circuit.failures >= FAILURE_OPEN_CIRCUIT_COUNT) {
      this.circuit.openUntilMs = Date.now() + CIRCUIT_OPEN_MS;
    }

    const message = lastError instanceof Error ? lastError.message : "Unknown AI generation error";
    return this.repository.upsert({
      alertId: request.alertId,
      expenseId: request.expenseId,
      companyId: request.companyId,
      adviceType,
      status: "FAILED",
      model: ADVICE_MODEL_DEFAULT,
      confidence: null,
      explanation: null,
      recommendation: null,
      payloadJson: null,
      inputHash,
      latencyMs: Date.now() - start,
      tokenUsage: null,
      errorMessage: message,
    });
  }
}

export function isAICopilotEnabled(): boolean {
  return process.env.AI_COPILOT_ENABLED === "true";
}

export function createExpenseCopilotAIService(): ExpenseCopilotAIService {
  const repository = new PrismaCopilotAIRepository();

  if (!isAICopilotEnabled()) {
    return new ExpenseCopilotAIService(repository, new RuleFallbackProvider());
  }

  const provider = process.env.AI_COPILOT_PROVIDER ?? "openai";
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.AI_COPILOT_BASE_URL ?? "https://api.openai.com/v1/responses";
    const model = process.env.AI_COPILOT_MODEL ?? "gpt-5-mini";
    if (!apiKey) {
      return new ExpenseCopilotAIService(repository, new RuleFallbackProvider());
    }
    return new ExpenseCopilotAIService(repository, new OpenAIHTTPProvider(apiKey, baseUrl, model));
  }

  return new ExpenseCopilotAIService(repository, new RuleFallbackProvider());
}
