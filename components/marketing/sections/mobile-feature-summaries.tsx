import {
  formatSharePercentage,
  getTotalAmount,
} from "@/lib/marketing/summary-math";
import { formatCurrency } from "@/lib/format-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryDistribution, UserSpending } from "@/types/analytics";

interface MobileFeatureSummariesProps {
  readonly categoryDistribution: readonly CategoryDistribution[];
  readonly userSpending: readonly UserSpending[];
}

export function MobileFeatureSummaries({
  categoryDistribution,
  userSpending,
}: MobileFeatureSummariesProps): React.JSX.Element {
  const topCategories = [...categoryDistribution]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 3);
  const totalCategoryAmount = getTotalAmount(categoryDistribution);
  const topUsers = [...userSpending]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 3);
  const totalUserAmount = getTotalAmount(userSpending);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="app-card-strong">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Categories</CardTitle>
          <CardDescription>Fast product summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {topCategories.map((category) => (
            <div
              key={category.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate text-sm font-medium">{category.name}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {formatSharePercentage(category.amount, totalCategoryAmount)}
                </p>
                <p className="text-sm font-semibold">{formatCurrency(category.amount)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="app-card-strong">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Top Team Members</CardTitle>
          <CardDescription>Most active contributors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {topUsers.map((user) => {
            const averageAmount = user.count > 0 ? user.amount / user.count : 0;

            return (
              <div
                key={user.email}
                className="rounded-lg border border-border/60 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.count} expense{user.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatSharePercentage(user.amount, totalUserAmount)}
                    </p>
                    <p className="text-sm font-semibold">{formatCurrency(user.amount)}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Average {formatCurrency(averageAmount)} per expense
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
