import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountLinking } from "@/components/blocks/auth/account-linking"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Shield, Mail, Building2, User } from "lucide-react"

interface SettingsPageProps {
    searchParams: Promise<{ 
        linked?: string
        stepUp?: string
        linkTarget?: string
        error?: string
        tab?: string
    }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps): Promise<React.JSX.Element> {
    // session.user is guaranteed by (dashboard)/layout.tsx auth guard
    const session = await auth()
    const user = session!.user!
    const params = await searchParams

    const [accounts, userWithCompany] = await Promise.all([
        prisma.account.findMany({
            where: { userId: user.id },
            select: {
                provider: true,
                providerAccountId: true,
                type: true,
            },
        }),
        prisma.user.findUnique({
            where: { id: user.id },
            select: {
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        }),
    ])

    const linkedProviders = accounts.map(a => a.provider)
    const companyName = userWithCompany?.company?.name ?? "No company assigned"

    // Handle different states
    const showLinkedSuccess = params.linked === "true"
    const stepUpVerified = params.stepUp === "true"
    const linkTarget = params.linkTarget as "github" | "google" | undefined
    const error = params.error

    return (
        <div className="space-y-6">
            <div>
                <h1 className="app-page-title">
                    <span className="app-page-title-gradient">Settings</span>
                </h1>
                <p className="text-muted-foreground">
                    Manage critical account and authentication settings.
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

            <Card className="app-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Account Overview
                    </CardTitle>
                    <CardDescription>
                        Core account identity used for sign-in, billing ownership, and audit visibility.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                        </p>
                        <p className="font-medium">{user.email ?? "Not available"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Full Name
                        </p>
                        <p className="font-medium">{user.name ?? "Not set"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Access Role
                        </p>
                        <p className="font-medium">{user.role}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Company
                        </p>
                        <p className="font-medium">{companyName}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="app-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Connected Accounts
                    </CardTitle>
                    <CardDescription>
                        Link multiple sign-in methods for continuity and account recovery.
                        Security verification is required when adding a new method.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AccountLinking 
                        linkedProviders={linkedProviders}
                        currentEmail={user.email || ""}
                        stepUpVerified={stepUpVerified}
                        linkTarget={linkTarget}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
