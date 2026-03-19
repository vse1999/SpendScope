"use client"

import { useState, useMemo } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Check, Github, Loader2, Unlink, ArrowRight } from "lucide-react"
import { StepUpDialog } from "./step-up-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { unlinkProvider } from "@/app/actions/auth"

interface AccountLinkingProps {
    linkedProviders: string[]
    currentEmail: string
    stepUpVerified?: boolean
    linkTarget?: "github" | "google"
}

const providers = [
    {
        id: "google",
        name: "Google",
        icon: ({ className }: { className?: string }) => (
            <svg className={className} viewBox="0 0 24 24">
                <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
            </svg>
        ),
    },
    {
        id: "github",
        name: "GitHub",
        icon: ({ className }: { className?: string }) => (
            <Github className={className} />
        ),
    },
]

export function AccountLinking({ 
    linkedProviders, 
    currentEmail,
    stepUpVerified = false,
    linkTarget,
}: AccountLinkingProps) {
    const [linking, setLinking] = useState<string | null>(null)
    const [unlinking, setUnlinking] = useState<string | null>(null)
    const [stepUpProvider, setStepUpProvider] = useState<"github" | "google" | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Derive verified provider from props using useMemo to avoid setState during render
    const verifiedProvider = useMemo<string | null>(() => {
        if (stepUpVerified && linkTarget && !linkedProviders.includes(linkTarget)) {
            return linkedProviders[0] ?? null
        }
        return null
    }, [stepUpVerified, linkTarget, linkedProviders])

    const handleLinkRequest = (providerId: string): void => {
        // If already verified via step-up, proceed directly to link
        if (verifiedProvider && linkTarget === providerId) {
            void handleDirectLink(providerId)
            return
        }
        // Otherwise show step-up dialog
        setStepUpProvider(providerId as "github" | "google")
    }

    const handleUnlink = async (providerId: string): Promise<void> => {
        setUnlinking(providerId)
        setError(null)
        
        const result = await unlinkProvider(providerId)
        
        if ("error" in result) {
            setError(result.error)
        }
        
        setUnlinking(null)
    }

    const handleDirectLink = async (providerId: string): Promise<void> => {
        setLinking(providerId)
        try {
            await signIn(providerId, {
                callbackUrl: "/dashboard/settings?linked=true",
            })
        } catch {
            setLinking(null)
        }
    }

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                    For security, you will need to verify your identity before connecting a new authentication method.
                </AlertDescription>
            </Alert>

            {providers.map((provider) => {
                const isLinked = linkedProviders.includes(provider.id)
                const isLoading = linking === provider.id
                const isUnlinking = unlinking === provider.id
                const isPendingLink = verifiedProvider && linkTarget === provider.id && !isLinked

                return (
                    <div
                        key={provider.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                    >
                        <div className="flex items-center gap-3">
                            <provider.icon className="w-5 h-5" />
                            <div>
                                <p className="font-medium">{provider.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {isLinked
                                        ? `Connected as ${currentEmail}`
                                        : "Not connected"}
                                </p>
                            </div>
                        </div>

                        {isLinked ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 text-green-600 mr-2">
                                    <Check className="w-4 h-4" />
                                    <span className="text-sm font-medium">Connected</span>
                                </div>
                                {linkedProviders.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnlink(provider.id)}
                                        disabled={isUnlinking}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        {isUnlinking ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Unlink className="w-4 h-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        ) : isPendingLink ? (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDirectLink(provider.id)}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        Complete Link
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLinkRequest(provider.id)}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    "Connect"
                                )}
                            </Button>
                        )}
                    </div>
                )
            })}

            <p className="text-sm text-muted-foreground">
                Connecting multiple accounts allows you to sign in with any of them.
                For security, you will be asked to verify your identity when adding a new authentication method.
            </p>

            <StepUpDialog
                isOpen={stepUpProvider !== null}
                onClose={() => setStepUpProvider(null)}
                targetProvider={stepUpProvider}
                linkedProviders={linkedProviders}
            />
        </div>
    )
}
