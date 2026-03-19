import type { ReactElement } from "react"

import { Button } from "@/components/ui/button"
import { signInAsDemo } from "@/app/actions/demo"
import { isDemoEnabled } from "@/lib/demo/config"
import { Sparkles } from "lucide-react"

interface DemoLoginButtonProps {
  redirectTo?: string
}

export function GuestDemoLoginButton({
  redirectTo = "/dashboard",
}: DemoLoginButtonProps): ReactElement | null {
  if (!isDemoEnabled()) {
    return null
  }

  return (
    <form action={signInAsDemo}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button
        type="submit"
        variant="secondary"
        className="w-full h-12 text-base font-medium"
      >
        <Sparkles className="w-5 h-5 mr-3" />
        Explore Demo Workspace
      </Button>
    </form>
  )
}
