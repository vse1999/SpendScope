import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Users, Plus } from "lucide-react"
import { CreateCompanyForm } from "@/components/create-company-form"
import { JoinCompanyList } from "@/components/join-company-list"

interface Company {
  id: string
  name: string
  slug: string
  _count: {
    users: number
  }
}

interface CompanySelectorProps {
  companies: Company[]
}

export function CompanySelector({ companies }: CompanySelectorProps) {
  return (
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
            <JoinCompanyList companies={companies} />
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
  )
}
