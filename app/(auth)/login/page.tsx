import { LoginForm } from "@/components/blocks/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Wallet, Shield, BarChart3, Zap } from "lucide-react"

interface LoginPageProps {
    searchParams: Promise<{ error?: string }>
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

const features = [
    {
        icon: BarChart3,
        title: "Real-time Analytics",
        description: "Track spending patterns with AI-powered insights",
    },
    {
        icon: Shield,
        title: "Enterprise Security",
        description: "Bank-grade encryption for your financial data",
    },
    {
        icon: Zap,
        title: "Instant Reports",
        description: "Generate expense reports in seconds, not hours",
    },
]

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams
    const error = params.error
    const errorInfo = error ? getErrorMessage(error) : null

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Brand / Marketing */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-foreground dark:bg-card">
                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                        backgroundSize: "32px 32px",
                    }}
                />
                {/* Gradient orbs */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-chart-2/15 blur-3xl" />

                <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground dark:text-foreground">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-semibold tracking-tight">SpendScope</span>
                    </div>

                    {/* Main content */}
                    <div className="space-y-8">
                        <div className="space-y-4 max-w-lg">
                            <h1 className="text-4xl font-bold tracking-tight leading-tight text-balance">
                                Enterprise expense analytics that scales with you
                            </h1>
                            <p className="text-lg leading-relaxed opacity-70">
                                Join thousands of companies using SpendScope to track, analyze, and optimize their spending.
                            </p>
                        </div>

                        {/* Feature list */}
                        <div className="space-y-5">
                            {features.map((feature) => (
                                <div key={feature.title} className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                                        <feature.icon className="h-5 w-5 text-primary dark:text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{feature.title}</p>
                                        <p className="text-sm opacity-60">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-sm opacity-40">
                        Trusted by 2,500+ companies worldwide
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col items-center justify-center bg-background p-6 sm:p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-semibold tracking-tight text-foreground">SpendScope</span>
                    </div>

                    {errorInfo && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{errorInfo.title}</AlertTitle>
                            <AlertDescription>{errorInfo.message}</AlertDescription>
                        </Alert>
                    )}

                    <LoginForm />
                </div>
            </div>
        </div>
    )
}
