"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { joinCompany } from "@/app/actions/companies"
import { Loader2, Building2, Users, ArrowRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Company {
  id: string
  name: string
  slug: string
  _count: {
    users: number
  }
}

interface JoinCompanyListProps {
  companies: Company[]
}

export function JoinCompanyList({ companies }: JoinCompanyListProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  async function handleJoin(companyId: string) {
    setIsLoading(companyId)
    setError(null)

    try {
      const result = await joinCompany(companyId)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.success) {
        // Force a full page navigation to /dashboard
        // This ensures the session is refreshed and data is fetched fresh
        window.location.href = "/dashboard"
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(null)
    }
  }

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No companies yet</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to create a company workspace!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredCompanies.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No companies match your search
          </p>
        ) : (
          filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{company.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>@{company.slug}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {company._count.users} member
                      {company._count.users !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleJoin(company.id)}
                disabled={isLoading === company.id}
              >
                {isLoading === company.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Join
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Don&apos;t see your company? Ask your admin for an invite or create a new one.
      </p>
    </div>
  )
}
