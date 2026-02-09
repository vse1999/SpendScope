import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountLinking } from "@/components/blocks/auth/account-linking"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { NotificationsSection } from "@/components/settings/notifications-section"
import { ProfileSection } from "@/components/settings/profile-section"
import { SecuritySection } from "@/components/settings/security-section"
import { DataSection } from "@/components/settings/data-section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Shield, User, Bell, Palette, Lock, Database } from "lucide-react"

interface SettingsPageProps {
    searchParams: Promise<{ 
        linked?: string
        stepUp?: string
        linkTarget?: string
        error?: string
        tab?: string
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
    const activeTab = params.tab || "profile"

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Manage your account settings and preferences.
                </p>
            </div>

            {showLinkedSuccess && (
                <Alert className="bg-success/10 border-success/20">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <AlertTitle className="text-foreground">Account Connected</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
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

            <Tabs defaultValue={activeTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 lg:w-auto">
                    <TabsTrigger value="profile" className="gap-2">
                        <User className="h-4 w-4 hidden sm:inline" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="gap-2">
                        <Palette className="h-4 w-4 hidden sm:inline" />
                        Appearance
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4 hidden sm:inline" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Lock className="h-4 w-4 hidden sm:inline" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="accounts" className="gap-2">
                        <Shield className="h-4 w-4 hidden sm:inline" />
                        Accounts
                    </TabsTrigger>
                    <TabsTrigger value="data" className="gap-2">
                        <Database className="h-4 w-4 hidden sm:inline" />
                        Data
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <ProfileSection 
                        user={{
                            id: session.user.id,
                            name: session.user.name,
                            email: session.user.email,
                            image: session.user.image,
                        }}
                    />
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                    <AppearanceSection />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <NotificationsSection />
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <SecuritySection />
                </TabsContent>

                <TabsContent value="accounts" className="space-y-6">
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
                </TabsContent>

                <TabsContent value="data" className="space-y-6">
                    <DataSection />
                </TabsContent>
            </Tabs>
        </div>
    )
}
