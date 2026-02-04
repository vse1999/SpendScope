"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCompany } from "@/app/actions/companies"
import { Loader2, Building2, CheckCircle2 } from "lucide-react"

export function CreateCompanyForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState("")

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setSlug(generateSlug(name))
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createCompany(formData)

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
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Company Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Inc."
          required
          disabled={isLoading}
          onChange={handleNameChange}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Company Slug</Label>
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground text-sm">spendscope.com/</span>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="acme-inc"
            required
            disabled={isLoading}
            className="flex-1 h-11"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens only"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This will be your company&apos;s unique URL identifier
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full h-11"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Company...
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 mr-2" />
            Create Company Workspace
          </>
        )}
      </Button>

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          You&apos;ll be the admin of this company
        </p>
        <p className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Default expense categories will be created
        </p>
        <p className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Free plan activated automatically
        </p>
      </div>
    </form>
  )
}
