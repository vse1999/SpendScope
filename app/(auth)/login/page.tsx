import { LoginForm } from "@/components/blocks/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface LoginPageProps {
    searchParams: Promise<{ error?: string; redirectTo?: string }>
}

function getErrorMessage(error: string): { title: string; message: string } {
    switch (error) {
        case "OAuthAccountNotLinked":
            return {
                title: "Account Not Linked",
                message: "An account with this email already exists using a different sign-in method. Please sign in with your original provider and link this account from your settings.",
            }
        case "UnverifiedEmail":
            return {
                title: "Unverified Email",
                message: "Your email address must be verified with your OAuth provider before you can sign in. Please verify your email with Google or GitHub and try again.",
            }
        case "OAuthSignin":
            return {
                title: "Sign In Error",
                message: "There was a problem with the OAuth sign in. Please try again.",
            }
        case "OAuthCallback":
            return {
                title: "Callback Error",
                message: "There was a problem with the OAuth callback. Please try again.",
            }
        case "AccessDenied":
            return {
                title: "Access Denied",
                message: "You do not have permission to access this resource.",
            }
        default:
            return {
                title: "Authentication Error",
                message: "An unexpected error occurred. Please try again.",
            }
    }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams
    const error = params.error
    const redirectTo =
        typeof params.redirectTo === "string" && params.redirectTo.startsWith("/")
            ? params.redirectTo
            : "/dashboard"
    const errorInfo = error ? getErrorMessage(error) : null

    return (
        <div className="min-h-screen app-shell flex flex-col items-center justify-center p-4">
            {errorInfo && (
                <Alert variant="destructive" className="max-w-md mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{errorInfo.title}</AlertTitle>
                    <AlertDescription>{errorInfo.message}</AlertDescription>
                </Alert>
            )}
            <LoginForm redirectTo={redirectTo} />
        </div>
    )
}
