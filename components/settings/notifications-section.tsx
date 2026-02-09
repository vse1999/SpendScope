"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  TrendingUp,
  Users,
  FileText,
  Megaphone,
  AtSign,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface NotificationsSectionProps {
  className?: string
}

interface NotificationSetting {
  id: string
  label: string
  description: string
  icon: React.ElementType
  enabled: boolean
}

interface NotificationGroup {
  id: string
  title: string
  icon: React.ElementType
  settings: NotificationSetting[]
}

export function NotificationsSection({ className }: NotificationsSectionProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})

  const [emailSettings, setEmailSettings] = useState<NotificationGroup>({
    id: "email",
    title: "Email Notifications",
    icon: Mail,
    settings: [
      {
        id: "weekly-digest",
        label: "Weekly Digest",
        description: "Get a summary of your spending every week",
        icon: FileText,
        enabled: true,
      },
      {
        id: "monthly-report",
        label: "Monthly Report",
        description: "Detailed monthly spending analysis and insights",
        icon: TrendingUp,
        enabled: true,
      },
      {
        id: "new-team-member",
        label: "New Team Member",
        description: "Notify when someone joins your team",
        icon: Users,
        enabled: true,
      },
      {
        id: "expense-limit",
        label: "Expense Limit Reached",
        description: "Alert when you approach or exceed budget limits",
        icon: Zap,
        enabled: false,
      },
    ],
  })

  const [inAppSettings, setInAppSettings] = useState<NotificationGroup>({
    id: "in-app",
    title: "In-App Notifications",
    icon: MessageSquare,
    settings: [
      {
        id: "real-time-updates",
        label: "Real-time Updates",
        description: "Instant notifications for new expenses and changes",
        icon: Zap,
        enabled: true,
      },
      {
        id: "mentions",
        label: "Mentions",
        description: "When someone mentions you in comments or notes",
        icon: AtSign,
        enabled: true,
      },
      {
        id: "system-announcements",
        label: "System Announcements",
        description: "Important updates about SpendScope",
        icon: Megaphone,
        enabled: true,
      },
    ],
  })

  const [pushEnabled, setPushEnabled] = useState(false)

  const handleToggle = async (
    groupId: string,
    settingId: string,
    currentGroup: NotificationGroup,
    setGroup: React.Dispatch<React.SetStateAction<NotificationGroup>>
  ): Promise<void> => {
    const toggleKey = `${groupId}-${settingId}`
    setIsLoading((prev) => ({ ...prev, [toggleKey]: true }))

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300))

      setGroup((prev) => ({
        ...prev,
        settings: prev.settings.map((s) =>
          s.id === settingId ? { ...s, enabled: !s.enabled } : s
        ),
      }))

      const setting = currentGroup.settings.find((s) => s.id === settingId)
      const newState = !setting?.enabled
      toast.success(
        `${setting?.label} ${newState ? "enabled" : "disabled"}`,
        {
          description: newState
            ? `You will now receive ${setting?.label.toLowerCase()} notifications`
            : `You will no longer receive ${setting?.label.toLowerCase()} notifications`,
        }
      )
    } catch (error) {
      toast.error("Failed to update notification preference")
    } finally {
      setIsLoading((prev) => ({ ...prev, [toggleKey]: false }))
    }
  }

  const handlePushToggle = async (): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, push: true }))

    try {
      if (!pushEnabled) {
        // Request browser notification permission
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          setPushEnabled(true)
          toast.success("Push notifications enabled")
        } else {
          toast.error("Permission denied", {
            description: "Please enable notifications in your browser settings",
          })
        }
      } else {
        setPushEnabled(false)
        toast.success("Push notifications disabled")
      }
    } catch (error) {
      toast.error("Failed to toggle push notifications")
    } finally {
      setIsLoading((prev) => ({ ...prev, push: false }))
    }
  }

  const renderNotificationGroup = (
    group: NotificationGroup,
    setGroup: React.Dispatch<React.SetStateAction<NotificationGroup>>
  ): React.JSX.Element => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <group.icon className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-medium">{group.title}</h4>
      </div>
      <div className="space-y-4 pl-7">
        {group.settings.map((setting) => {
          const Icon = setting.icon
          const toggleKey = `${group.id}-${setting.id}`
          const loading = isLoading[toggleKey]

          return (
            <div
              key={setting.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-muted p-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`${group.id}-${setting.id}`}
                    className="font-medium cursor-pointer"
                  >
                    {setting.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <Switch
                id={`${group.id}-${setting.id}`}
                checked={setting.enabled}
                onCheckedChange={() =>
                  handleToggle(group.id, setting.id, group, setGroup)
                }
                disabled={loading}
              />
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>Choose how and when you want to be notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Email Notifications */}
        {renderNotificationGroup(emailSettings, setEmailSettings)}

        <Separator />

        {/* In-App Notifications */}
        {renderNotificationGroup(inAppSettings, setInAppSettings)}

        <Separator />

        {/* Push Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Push Notifications</h4>
          </div>
          <div className="pl-7">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
              <div className="space-y-1">
                <Label htmlFor="push-notifications" className="font-medium cursor-pointer">
                  Browser Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications even when SpendScope is not open
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={isLoading["push"]}
              />
            </div>
          </div>
        </div>

        {/* Test Notification Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              toast.info("Test Notification", {
                description: "This is how your notifications will look!",
              })
            }}
            className={cn(
              "text-sm text-muted-foreground underline-offset-4 hover:underline",
              "transition-colors hover:text-foreground"
            )}
          >
            Send test notification
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
