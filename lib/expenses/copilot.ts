export const DEFAULT_COPILOT_POLICY_THRESHOLD_USD = 1000;
const MIN_HISTORY_FOR_UNUSUAL_SPEND = 5;
const MIN_UNUSUAL_AMOUNT_USD = 100;
const UNUSUAL_MULTIPLIER = 2.2;

export interface CopilotExpenseSignal {
  id: string;
  amount: number;
  description: string;
  date: Date;
  categoryId: string;
  categoryName: string;
  userId: string;
  userDisplayName: string;
}

export interface ExpenseAnomalyCandidate {
  expenseId: string;
  ruleType: "DUPLICATE" | "POLICY_BREACH" | "UNUSUAL_SPEND";
  severity: number;
  reason: string;
  confidence: number;
}

export interface ExpensePolicyContext {
  globalThresholdUsd: number;
  categoryThresholds?: Record<string, number>;
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildDuplicateCandidates(expenses: CopilotExpenseSignal[]): ExpenseAnomalyCandidate[] {
  const clusters = new Map<string, CopilotExpenseSignal[]>();

  for (const expense of expenses) {
    const cents = Math.round(expense.amount * 100);
    const key = `${expense.userId}|${expense.categoryId}|${cents}|${normalizeDescription(expense.description)}`;
    const existing = clusters.get(key) ?? [];
    existing.push(expense);
    clusters.set(key, existing);
  }

  const anomalies: ExpenseAnomalyCandidate[] = [];

  for (const clusterExpenses of clusters.values()) {
    if (clusterExpenses.length < 2) {
      continue;
    }

    const ordered = [...clusterExpenses].sort((a, b) => a.date.getTime() - b.date.getTime());
    const baseline = ordered[0];

    for (let index = 1; index < ordered.length; index += 1) {
      const duplicate = ordered[index];
      const daysApart = Math.round(
        Math.abs(duplicate.date.getTime() - baseline.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      const confidence = clamp(0.75 + (daysApart <= 2 ? 0.2 : 0), 0, 1);
      anomalies.push({
        expenseId: duplicate.id,
        ruleType: "DUPLICATE",
        severity: 70,
        confidence,
        reason: `Possible duplicate of ${formatAmount(baseline.amount)} submitted on ${baseline.date.toLocaleDateString("en-US")}.`,
      });
    }
  }

  return anomalies;
}

function buildPolicyBreachCandidates(
  expenses: CopilotExpenseSignal[],
  policy: ExpensePolicyContext
): ExpenseAnomalyCandidate[] {
  return expenses
    .filter((expense) => {
      const threshold = policy.categoryThresholds?.[expense.categoryId] ?? policy.globalThresholdUsd;
      return expense.amount >= threshold;
    })
    .map((expense) => {
      const threshold = policy.categoryThresholds?.[expense.categoryId] ?? policy.globalThresholdUsd;
      const overshootRatio = expense.amount / threshold;
      const confidence = clamp(0.8 + (overshootRatio - 1) * 0.1, 0, 1);
      return {
        expenseId: expense.id,
        ruleType: "POLICY_BREACH",
        severity: 85,
        confidence,
        reason: `Amount ${formatAmount(expense.amount)} exceeds policy threshold ${formatAmount(threshold)}.`,
      };
    });
}

function buildUnusualSpendCandidates(expenses: CopilotExpenseSignal[]): ExpenseAnomalyCandidate[] {
  const grouped = new Map<string, number[]>();
  for (const expense of expenses) {
    const key = `${expense.userId}|${expense.categoryId}`;
    const existing = grouped.get(key) ?? [];
    existing.push(expense.amount);
    grouped.set(key, existing);
  }

  const anomalies: ExpenseAnomalyCandidate[] = [];
  for (const expense of expenses) {
    const key = `${expense.userId}|${expense.categoryId}`;
    const history = grouped.get(key) ?? [];

    if (history.length < MIN_HISTORY_FOR_UNUSUAL_SPEND) {
      continue;
    }

    const average = history.reduce((sum, value) => sum + value, 0) / history.length;
    const threshold = Math.max(MIN_UNUSUAL_AMOUNT_USD, average * UNUSUAL_MULTIPLIER);
    if (expense.amount < threshold) {
      continue;
    }

    const ratio = average > 0 ? expense.amount / average : UNUSUAL_MULTIPLIER;
    const confidence = clamp(0.7 + (ratio - UNUSUAL_MULTIPLIER) * 0.08, 0, 1);
    const severity = clamp(Math.round(65 + (ratio - UNUSUAL_MULTIPLIER) * 10), 65, 95);
    anomalies.push({
      expenseId: expense.id,
      ruleType: "UNUSUAL_SPEND",
      severity,
      confidence,
      reason: `Amount ${formatAmount(expense.amount)} is unusually high for ${expense.categoryName} vs historical average ${formatAmount(average)}.`,
    });
  }

  return anomalies;
}

export function detectExpenseAnomalies(
  expenses: CopilotExpenseSignal[],
  policy: ExpensePolicyContext = { globalThresholdUsd: DEFAULT_COPILOT_POLICY_THRESHOLD_USD, categoryThresholds: {} }
): ExpenseAnomalyCandidate[] {
  const duplicate = buildDuplicateCandidates(expenses);
  const policyBreach = buildPolicyBreachCandidates(expenses, policy);
  const unusual = buildUnusualSpendCandidates(expenses);

  const all = [...duplicate, ...policyBreach, ...unusual];
  const byKey = new Map<string, ExpenseAnomalyCandidate>();

  for (const anomaly of all) {
    const key = `${anomaly.expenseId}|${anomaly.ruleType}`;
    const existing = byKey.get(key);
    if (!existing || anomaly.severity > existing.severity) {
      byKey.set(key, anomaly);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.severity - a.severity);
}
