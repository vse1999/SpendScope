import { GoogleSignInButton, GitHubSignInButton } from "./oauth-buttons"
import Link from "next/link"
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
          Enterprise Expense Analytics Platform
        </p>
      </div>

      <p className="text-sm text-center text-muted-foreground">
        Sign in to access your expense dashboard
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

      <p className="text-xs text-center text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
