import { GoogleSignInButton, GitHubSignInButton } from "./oauth-buttons"
import { cn } from "@/lib/utils"

interface LoginFormProps {
  className?: string
  redirectTo?: string
}

export function LoginForm({
  className,
  redirectTo = "/dashboard",
}: LoginFormProps) {
  return (
    <div className={cn("w-full max-w-md space-y-6", className)}>
      <div className="text-center space-y-2">
        <h1 className="app-page-title">
          <span className="app-page-title-gradient">SpendScope</span>
        </h1>
        <p className="text-base text-muted-foreground">
          Sign in to the workspace your team uses to review spend, policy risk, and billing access
        </p>
      </div>

      <p className="text-sm text-center text-muted-foreground">
        For returning finance leads, ops owners, and teammates who already have workspace access
      </p>

      <div className="space-y-3">
        <GoogleSignInButton redirectTo={redirectTo} />
        <GitHubSignInButton redirectTo={redirectTo} />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Secure authentication
          </span>
        </div>
      </div>
    </div>
  )
}
