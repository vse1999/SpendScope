"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Shield, AlertTriangle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StepUpDialogProps {
    isOpen: boolean
    onClose: () => void
    targetProvider: "github" | "google" | null
    linkedProviders: string[]
}

export function StepUpDialog({
    isOpen,
    onClose,
    targetProvider,
    linkedProviders,
}: StepUpDialogProps) {
    const [isVerifying, setIsVerifying] = useState<string | null>(null)

    const handleVerify = async (provider: string) => {
        setIsVerifying(provider)
        
        // SECURITY: Step-up authentication
        // User must re-authenticate with one of their linked providers
        // This prevents account hijacking on unlocked computers
        
        try {
            await signIn(provider, {
                callbackUrl: `/dashboard/settings?stepUp=true&linkTarget=${targetProvider}`,
                // prompt=consent is configured in auth.ts to force re-authentication
            })
        } catch {
            setIsVerifying(null)
        }
    }

    const getProviderName = (provider: string) => {
        return provider.charAt(0).toUpperCase() + provider.slice(1)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-500" />
                        Security Verification Required
                    </DialogTitle>
                    <DialogDescription>
                        Before linking a new authentication method, please verify your identity with one of your current providers.
                    </DialogDescription>
                </DialogHeader>

                <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                        This extra step protects your account from unauthorized access.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3 py-4">
                    <p className="text-sm text-muted-foreground">
                        You are about to connect <strong>{getProviderName(targetProvider || "")}</strong> to your account.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Please confirm your identity by signing in again:
                    </p>
                    
                    <div className="space-y-2">
                        {linkedProviders.map((provider) => (
                            <button
                                key={provider}
                                onClick={() => handleVerify(provider)}
                                disabled={isVerifying !== null}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left disabled:opacity-50"
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg">
                                        {provider === "google" ? "G" : "GH"}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{getProviderName(provider)}</p>
                                    <p className="text-xs text-muted-foreground">Click to verify</p>
                                </div>
                                {isVerifying === provider ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : (
                                    <Shield className="h-5 w-5 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isVerifying !== null}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
