import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountLinking } from "@/components/blocks/auth/account-linking"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Shield } from "lucide-react"

interface SettingsPageProps {
    searchParams: Promise<{ 
        linked?: string
        stepUp?: string
        linkTarget?: string
        error?: string
    }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const session = await auth()
    const params = await searchParams

    if (!session?.user?.id) {
        redirect("/login")
    }

    // Get user's linked accounts
    const accounts = await prisma.account.findMany({
        where: { userId: session.user.id },
        select: {
            provider: true,
            providerAccountId: true,
            type: true,
        },
    })

    const linkedProviders = accounts.map(a => a.provider)

    // Handle different states
    const showLinkedSuccess = params.linked === "true"
    const stepUpVerified = params.stepUp === "true"
    const linkTarget = params.linkTarget as "github" | "google" | undefined
    const error = params.error

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            {showLinkedSuccess && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 dark:text-green-200">Account Connected</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                        Your account has been successfully linked with enhanced security verification.
                        You can now sign in using either provider.
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>
                        {error === "stepUpFailed" 
                            ? "Security verification failed. Please try again." 
                            : "An error occurred. Please try again."}
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Connected Accounts
                    </CardTitle>
                    <CardDescription>
                        Link multiple authentication methods to your account for easier sign-in.
                        Security verification is required when adding new methods.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AccountLinking 
                        linkedProviders={linkedProviders}
                        currentEmail={session.user.email || ""}
                        stepUpVerified={stepUpVerified === true}
                        linkTarget={linkTarget}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
