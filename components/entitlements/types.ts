export type UpgradeFeature =
  | "analytics"
  | "csvExport"
  | "teamInvites"
  | "userSeats"
  | "monthlyExpenses";

export type UpgradeSource =
  | "analytics_page"
  | "expenses_export"
  | "team_invite"
  | "expense_create";

export interface UpgradeDialogContext {
  feature: UpgradeFeature;
  source: UpgradeSource;
  reason?: string;
}
