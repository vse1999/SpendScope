import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpenseInitialLoadIssue {
  label: string;
  message: string;
}

interface ExpenseInitialLoadErrorStateProps {
  issues: ExpenseInitialLoadIssue[];
  retryHref: string;
}

export function ExpenseInitialLoadErrorState({
  issues,
  retryHref,
}: ExpenseInitialLoadErrorStateProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Expenses
        </h1>
        <p className="text-muted-foreground">
          We could not load the expense workspace data needed to render this page.
        </p>
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Expense data is temporarily unavailable</CardTitle>
              <CardDescription className="text-muted-foreground">
                We stopped the page from rendering partial or misleading numbers. Retry the load once the failing sections recover.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.label}
                className="rounded-lg border border-border/70 bg-background/70 px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{issue.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{issue.message}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={retryHref}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retry loading expenses
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
