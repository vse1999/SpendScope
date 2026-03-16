import { ExpenseCopilotAIService, isAICopilotEnabled } from "@/lib/expenses/copilot-ai";
import type { CopilotAdviceRecord, CopilotAdviceRequestContext, CopilotAdviceType } from "@/lib/expenses/copilot-ai-contracts";

class FakeRepository {
  public records: CopilotAdviceRecord[] = [];

  async upsert(record: {
    alertId: string;
    expenseId: string;
    companyId: string;
    adviceType: CopilotAdviceType;
    status: "READY" | "FAILED" | "STALE";
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
    const next: CopilotAdviceRecord = {
      id: `rec_${this.records.length + 1}`,
      alertId: record.alertId,
      expenseId: record.expenseId,
      companyId: record.companyId,
      adviceType: record.adviceType,
      status: record.status,
      model: record.model,
      promptVersion: "expense-copilot-v1",
      confidence: record.confidence,
      explanation: record.explanation,
      recommendation: record.recommendation,
      payloadJson: record.payloadJson,
      inputHash: record.inputHash,
      latencyMs: record.latencyMs,
      tokenUsage: record.tokenUsage,
      errorMessage: record.errorMessage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(next);
    return next;
  }
}

function buildRequest(): CopilotAdviceRequestContext {
  return {
    alertId: "exp-1:POLICY_BREACH",
    expenseId: "exp-1",
    companyId: "company-1",
    ruleType: "POLICY_BREACH",
    reason: "Amount exceeds policy threshold",
    severity: 88,
    confidence: 0.9,
    amount: 1250,
    categoryName: "Meals",
    expenseDescription: "Client dinner",
    userDisplayName: "Alex",
    expenseDateIso: new Date("2026-02-12T10:00:00.000Z").toISOString(),
  };
}

describe("expense copilot ai service", () => {
  it("stores READY record for valid provider payload", async (): Promise<void> => {
    const repository = new FakeRepository();
    const provider = {
      generate: jest.fn().mockResolvedValue({
        payload: {
          summary: "Likely policy breach.",
          rationaleBullets: ["Amount significantly above threshold."],
          recommendedAction: "ESCALATE",
        },
        confidence: 0.84,
        explanation: "Based on policy threshold context.",
        recommendation: "ESCALATE",
        model: "test-model",
        tokenUsage: 120,
      }),
    };

    const service = new ExpenseCopilotAIService(repository as never, provider);
    const result = await service.generateAndStore("copilot_case_summary", buildRequest());

    expect(result.status).toBe("READY");
    expect(result.model).toBe("test-model");
    expect(provider.generate).toHaveBeenCalledTimes(1);
  });

  it("stores FAILED record when payload schema is invalid", async (): Promise<void> => {
    const repository = new FakeRepository();
    const provider = {
      generate: jest.fn().mockResolvedValue({
        payload: {
          wrong: true,
        },
        confidence: 0.5,
        model: "bad-model",
      }),
    };

    const service = new ExpenseCopilotAIService(repository as never, provider);
    const result = await service.generateAndStore("copilot_case_summary", buildRequest());

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBeTruthy();
  });

  it("returns false when AI feature flag is disabled", (): void => {
    const previous = process.env.AI_COPILOT_ENABLED;
    process.env.AI_COPILOT_ENABLED = "false";
    expect(isAICopilotEnabled()).toBe(false);
    process.env.AI_COPILOT_ENABLED = previous;
  });
});
