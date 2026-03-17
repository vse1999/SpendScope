import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TeamSectionErrorStateProps {
  readonly description: string;
  readonly onRetry?: () => void;
  readonly title: string;
}

export function TeamSectionErrorState({
  description,
  onRetry,
  title,
}: TeamSectionErrorStateProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {onRetry ? (
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh section
          </Button>
        </div>
      ) : null}
    </div>
  );
}
