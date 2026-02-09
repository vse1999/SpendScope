import { GoogleSignInButton, GitHubSignInButton } from "./oauth-buttons"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"

interface LoginFormProps {
  className?: string
  redirectTo?: string
}

export function LoginForm({ className, redirectTo = "/dashboard" }: LoginFormProps) {
  return (
    <div className={cn("w-full max-w-md space-y-8", className)}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Sign in to your account to continue managing your expenses.
        </p>
      </div>

      <div className="space-y-3">
        <GoogleSignInButton redirectTo={redirectTo} />
        <GitHubSignInButton redirectTo={redirectTo} />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secured with enterprise-grade encryption</span>
      </div>

      <p className="text-xs text-center text-muted-foreground/70">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
