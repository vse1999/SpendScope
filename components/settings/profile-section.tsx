"use client"

import React, { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  User,
  Camera,
  Loader2,
  Mail,
  Phone,
  Globe,
  Clock,
  Check,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ProfileSectionProps {
  className?: string
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, "Invalid phone number").optional().or(z.literal("")),
  timezone: z.string(),
  language: z.string(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
]

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
]

export function ProfileSection({ className, user }: ProfileSectionProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(user?.image || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use user prop or fallback to mock data
  const userData = {
    email: user?.email || "john.doe@example.com",
    name: user?.name || "John Doe",
    phone: "+1 (555) 123-4567",
    timezone: "America/New_York",
    language: "en",
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userData.name,
      phone: userData.phone,
      timezone: userData.timezone,
      language: userData.language,
    },
  })

  const watchedTimezone = watch("timezone")
  const watchedLanguage = watch("language")

  const handleAvatarClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    setIsUploading(true)
    try {
      // Simulate upload - in real app, upload to server/storage
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatar(e.target?.result as string)
        toast.success("Avatar updated successfully")
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error("Failed to upload avatar")
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData): Promise<void> => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Profile updated successfully")
      reset(data) // Reset form state to new values
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = (): void => {
    reset()
    toast.info("Changes discarded")
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>Manage your personal information and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar
                className={cn(
                  "h-24 w-24 cursor-pointer transition-opacity hover:opacity-80",
                  isUploading && "opacity-50"
                )}
                onClick={handleAvatarClick}
              >
                <AvatarImage src={avatar || undefined} alt="Profile" />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {userData.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploading}
                className={cn(
                  "absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground shadow-sm",
                  "transition-colors hover:bg-primary/90",
                  isUploading && "cursor-not-allowed opacity-50"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Profile Photo</p>
              <p className="text-sm text-muted-foreground">
                Click the camera icon to upload a new photo
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                {...register("name")}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  value={userData.email}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Contact support to change your email
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  {...register("phone")}
                  className={cn("pl-10", errors.phone && "border-destructive")}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={watchedTimezone}
                onValueChange={(value) => setValue("timezone", value, { shouldDirty: true })}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={watchedLanguage}
                onValueChange={(value) => setValue("language", value, { shouldDirty: true })}
              >
                <SelectTrigger id="language" className="w-full md:w-[300px]">
                  <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!isDirty || isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
