import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAllCompanies, getUserCompany } from "@/app/actions/companies"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Building2, Users, Plus } from "lucide-react"
import { CreateCompanyForm } from "@/components/create-company-form"
import { JoinCompanyList } from "@/components/join-company-list"

export default async function OnboardingPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check if user already has a company
  const userCompanyResult = await getUserCompany()
  
  if (userCompanyResult.hasCompany) {
    redirect("/dashboard")
  }

  // Fetch available companies
  const companies = await getAllCompanies()
  const companyList = "error" in companies ? [] : companies

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome to SpendScope!</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hi {session.user.name?.split(" ")[0] || "there"}! To get started with expense tracking, 
            you need to join or create a company workspace.
          </p>
        </div>

        {/* Options */}
        <Tabs defaultValue="join" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Join Company
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Company
            </TabsTrigger>
          </TabsList>

          <TabsContent value="join" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Join an Existing Company
                </CardTitle>
                <CardDescription>
                  Select a company from the list below to join their workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JoinCompanyList companies={companyList} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create a New Company
                </CardTitle>
                <CardDescription>
                  Set up a new company workspace. You&apos;ll be the admin and can invite team members later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateCompanyForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Features Info */}
        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary mb-1">Track</div>
              <p className="text-sm text-muted-foreground">
                Log and categorize all company expenses
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary mb-1">Analyze</div>
              <p className="text-sm text-muted-foreground">
                View spending insights and reports
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary mb-1">Collaborate</div>
              <p className="text-sm text-muted-foreground">
                Work together with your team
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sign Out */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Not {session.user.email}?{" "}
            <form action="/api/auth/signout" method="POST" className="inline">
              <button type="submit" className="text-primary hover:underline">
                Sign out
              </button>
            </form>
          </p>
        </div>
      </div>
    </div>
  )
}
