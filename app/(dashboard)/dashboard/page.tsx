import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Welcome back, {session.user.name}!
                        </p>
                    </div>

                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: "/" })
                        }}
                    >
                        <Button type="submit" variant="outline">
                            Sign Out
                        </Button>
                    </form>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardDescription>Total Expenses</CardDescription>
                            <CardTitle className="text-3xl">$0.00</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                No expenses recorded yet
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardDescription>This Month</CardDescription>
                            <CardTitle className="text-3xl">$0.00</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Start tracking your expenses
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardDescription>Budget Remaining</CardDescription>
                            <CardTitle className="text-3xl">$0.00</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Set a budget to get started
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* User Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>Your current session details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center gap-4">
                            {session.user.image && (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    className="w-16 h-16 rounded-full"
                                />
                            )}
                            <div>
                                <p className="font-medium">{session.user.name}</p>
                                <p className="text-sm text-muted-foreground">{session.user.email}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Coming Soon Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>🚀 Coming Soon</CardTitle>
                        <CardDescription>Features currently in development</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            <li>✅ Authentication (Complete!)</li>
                            <li>🔄 Expense Management (Week 2)</li>
                            <li>🔄 Category Management (Week 2)</li>
                            <li>🔄 Analytics Dashboard (Week 3)</li>
                            <li>🔄 Subscription Integration (Week 3)</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
