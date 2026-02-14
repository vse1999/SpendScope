import { z } from "zod";

export type CopilotAdviceType =
  | "copilot_case_summary"
  | "triage_priority"
  | "policy_suggestion";

export type CopilotAdviceStatus = "READY" | "FAILED" | "STALE";

export interface CopilotCaseSummaryPayload {
  summary: string;
  rationaleBullets: string[];
  recommendedAction: "MARK_VALID" | "FALSE_ALARM" | "REQUEST_RECEIPT" | "ESCALATE";
}

export interface TriagePriorityPayload {
  priorityScore: number;
  impactLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  urgencyReason: string;
}

export interface PolicySuggestionPayload {
  categoryName?: string;
  currentThresholdUsd?: number;
  suggestedThresholdUsd?: number;
  rationale: string;
}

export type CopilotAdvicePayload =
  | CopilotCaseSummaryPayload
  | TriagePriorityPayload
  | PolicySuggestionPayload;

export interface CopilotAdviceRequestContext {
  alertId: string;
  expenseId: string;
  companyId: string;
  ruleType: "DUPLICATE" | "POLICY_BREACH" | "UNUSUAL_SPEND";
  reason: string;
  severity: number;
  confidence: number;
  amount: number;
  categoryName: string;
  expenseDescription: string;
  userDisplayName: string;
  expenseDateIso: string;
}

export interface CopilotAdviceRecord {
  id: string;
  alertId: string;
  expenseId: string;
  companyId: string;
  adviceType: CopilotAdviceType;
  status: CopilotAdviceStatus;
  model: string;
  promptVersion: string;
  confidence: number | null;
  explanation: string | null;
  recommendation: string | null;
  payloadJson: string | null;
  inputHash: string;
  latencyMs: number | null;
  tokenUsage: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSummarySchema = z.object({
  summary: z.string().min(1).max(600),
  rationaleBullets: z.array(z.string().min(1).max(220)).min(1).max(5),
  recommendedAction: z.enum(["MARK_VALID", "FALSE_ALARM", "REQUEST_RECEIPT", "ESCALATE"]),
});

const TriagePrioritySchema = z.object({
  priorityScore: z.number().min(0).max(100),
  impactLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  urgencyReason: z.string().min(1).max(320),
});

const PolicySuggestionSchema = z.object({
  categoryName: z.string().min(1).max(120).optional(),
  currentThresholdUsd: z.number().positive().optional(),
  suggestedThresholdUsd: z.number().positive().optional(),
  rationale: z.string().min(1).max(600),
});

export function validateAdvicePayload(
  adviceType: CopilotAdviceType,
  payload: unknown
): CopilotAdvicePayload {
  if (adviceType === "copilot_case_summary") {
    return CaseSummarySchema.parse(payload);
  }

  if (adviceType === "triage_priority") {
    return TriagePrioritySchema.parse(payload);
  }

  return PolicySuggestionSchema.parse(payload);
}

