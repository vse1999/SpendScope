"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TestTube } from "lucide-react"

interface TestLoginFormProps {
  redirectTo?: string
}

export function TestLoginForm({ redirectTo = "/dashboard" }: TestLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: redirectTo,
      })

      if (result?.error) {
        setError("Invalid test credentials")
      } else if (result?.url) {
        window.location.href = result.url
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  async function quickLogin() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email: "test@spendscope.local",
        password: "test123",
        redirect: false,
        callbackUrl: redirectTo,
      })


      if (result?.error) {
        setError(`Test login failed: ${result.error}`)
      } else if (result?.url) {
        window.location.href = result.url
      } else {
        setError("No redirect URL returned")
      }
    } catch (err) {
      void err
      setError(`Something went wrong: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 border border-dashed border-amber-400 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <TestTube className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Development Only</span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
        onClick={quickLogin}
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Quick Test Login"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-amber-300" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-amber-50 dark:bg-amber-950 px-2 text-amber-600">
            or
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="test-email" className="text-xs">Test Email</Label>
          <Input
            id="test-email"
            name="email"
            type="email"
            defaultValue="test@spendscope.local"
            placeholder="test@spendscope.local"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-password" className="text-xs">Test Password</Label>
          <Input
            id="test-password"
            name="password"
            type="password"
            defaultValue="test123"
            placeholder="test123"
            className="h-9 text-sm"
          />
        </div>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          variant="outline"
          className="w-full border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Test Login"}
        </Button>
      </form>

      <p className="text-[10px] text-amber-600/80 text-center">
        This is only visible in development mode
      </p>
    </div>
  )
}
