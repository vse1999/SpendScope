"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Shield,
  Lock,
  Smartphone,
  Globe,
  Clock,
  LogOut,
  Key,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Loader2,
  ChevronRight,
  Monitor,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface SecuritySectionProps {
  className?: string
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

interface Session {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActive: string
  isCurrent: boolean
}

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string
}

export function SecuritySection({ className }: SecuritySectionProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})

  const [sessions] = useState<Session[]>([
    {
      id: "1",
      device: "MacBook Pro",
      browser: "Chrome",
      location: "San Francisco, CA",
      ip: "192.168.1.1",
      lastActive: "Active now",
      isCurrent: true,
    },
    {
      id: "2",
      device: "iPhone 15",
      browser: "Safari",
      location: "San Francisco, CA",
      ip: "192.168.1.2",
      lastActive: "2 hours ago",
      isCurrent: false,
    },
    {
      id: "3",
      device: "Windows PC",
      browser: "Firefox",
      location: "New York, NY",
      ip: "192.168.1.3",
      lastActive: "3 days ago",
      isCurrent: false,
    },
  ])

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "Production API Key",
      key: "sk_live_xxxxxxxxxxxxxxxxxxxx",
      createdAt: "2024-01-15",
      lastUsed: "2 hours ago",
    },
    {
      id: "2",
      name: "Development API Key",
      key: "sk_test_yyyyyyyyyyyyyyyyyyyy",
      createdAt: "2024-02-01",
      lastUsed: "5 minutes ago",
    },
  ])

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onPasswordSubmit = async (data: PasswordFormData): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, password: true }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Password updated successfully")
      reset()
    } catch (error) {
      toast.error("Failed to update password")
    } finally {
      setIsLoading((prev) => ({ ...prev, password: false }))
    }
  }

  const handleTwoFactorToggle = async (): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, twoFactor: true }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setTwoFactorEnabled(!twoFactorEnabled)
      toast.success(
        twoFactorEnabled ? "Two-factor authentication disabled" : "Two-factor authentication enabled"
      )
    } catch (error) {
      toast.error("Failed to update two-factor authentication")
    } finally {
      setIsLoading((prev) => ({ ...prev, twoFactor: false }))
    }
  }

  const handleRevokeSession = async (sessionId: string): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, [`session-${sessionId}`]: true }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success("Session revoked")
    } catch (error) {
      toast.error("Failed to revoke session")
    } finally {
      setIsLoading((prev) => ({ ...prev, [`session-${sessionId}`]: false }))
    }
  }

  const handleCopyApiKey = (keyId: string, key: string): void => {
    navigator.clipboard.writeText(key)
    toast.success("API key copied to clipboard")
  }

  const handleRegenerateApiKey = async (keyId: string): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, [`api-${keyId}`]: true }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("API key regenerated")
      // In real app, update the key in state from API response
    } catch (error) {
      toast.error("Failed to regenerate API key")
    } finally {
      setIsLoading((prev) => ({ ...prev, [`api-${keyId}`]: false }))
    }
  }

  const toggleShowPassword = (field: string): void => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const toggleShowApiKey = (keyId: string): void => {
    setShowApiKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>Manage your account security and access settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Password Change */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Change Password</h4>
          </div>
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 pl-7">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  {...register("currentPassword")}
                  className={cn("pr-10", errors.currentPassword && "border-destructive")}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword("current")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  {...register("newPassword")}
                  className={cn("pr-10", errors.newPassword && "border-destructive")}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  {...register("confirmPassword")}
                  className={cn("pr-10", errors.confirmPassword && "border-destructive")}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={!isDirty || isLoading["password"]}>
              {isLoading["password"] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </div>

        <Separator />

        {/* Two-Factor Authentication */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-medium">Two-Factor Authentication</h4>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
              disabled={isLoading["twoFactor"]}
            />
          </div>
          <Alert className={cn("ml-7", twoFactorEnabled ? "border-green-500/50 bg-green-500/10" : "")}>
            <Shield className="h-4 w-4" />
            <AlertTitle>
              {twoFactorEnabled ? "2FA is enabled" : "Protect your account"}
            </AlertTitle>
            <AlertDescription>
              {twoFactorEnabled
                ? "Your account is protected with an additional layer of security."
                : "Add an extra layer of security by requiring a verification code in addition to your password."}
            </AlertDescription>
          </Alert>
        </div>

        <Separator />

        {/* Active Sessions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Active Sessions</h4>
          </div>
          <div className="space-y-3 pl-7">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {session.device} • {session.browser}
                      </p>
                      {session.isCurrent && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.location} • {session.ip}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.lastActive}
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={isLoading[`session-${session.id}`]}
                  >
                    {isLoading[`session-${session.id}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    <span className="sr-only">Revoke session</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Login History Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Login History</h4>
          </div>
          <Button variant="ghost" size="sm">
            View History
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* API Keys */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">API Keys</h4>
          </div>
          <div className="space-y-3 pl-7">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{apiKey.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {apiKey.createdAt} • Last used {apiKey.lastUsed}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                    {showApiKeys[apiKey.id] ? apiKey.key : "•".repeat(24)}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey(apiKey.id)}
                  >
                    {showApiKeys[apiKey.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyApiKey(apiKey.id, apiKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRegenerateApiKey(apiKey.id)}
                    disabled={isLoading[`api-${apiKey.id}`]}
                  >
                    {isLoading[`api-${apiKey.id}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Key className="mr-2 h-4 w-4" />
              Generate New API Key
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
