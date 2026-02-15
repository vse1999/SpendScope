import type { ExpenseCopilotAlert } from "@/app/actions/expenses";
import type { ServerExpenseItem, Expense } from "./expenses-client-types";

export function normalizeExpenseItem(item: ServerExpenseItem): Expense {
  const normalizedAmount = typeof item.amount === "number" ? item.amount : Number.parseFloat(item.amount);

  return {
    ...item,
    amount: Number.isNaN(normalizedAmount) ? 0 : normalizedAmount,
    date: item.date instanceof Date ? item.date : new Date(item.date),
  };
}

export function getCopilotRuleLabel(ruleType: ExpenseCopilotAlert["ruleType"]): string {
  if (ruleType === "DUPLICATE") return "Potential Duplicate";
  if (ruleType === "POLICY_BREACH") return "Policy Limit Risk";
  return "Unusual Spend Pattern";
}

export function getSeverityVariant(
  severity: number
): "default" | "secondary" | "destructive" | "outline" {
  if (severity >= 85) return "destructive";
  if (severity >= 70) return "default";
  return "secondary";
}
