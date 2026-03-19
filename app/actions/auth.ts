"use server"

import { auth } from "@/auth"
import { isDemoGuestEmail } from "@/lib/demo/config"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function unlinkProvider(provider: string): Promise<{ success: true } | { error: string }> {
    const session = await auth()

    if (!session?.user?.id || !session.user.email) {
        return { error: "Not authenticated" }
    }

    if (isDemoGuestEmail(session.user.email)) {
        return { error: "Demo access cannot connect or remove authentication providers." }
    }

    // SECURITY: Prevent unlinking the last provider (would lock user out)
    const accounts = await prisma.account.findMany({
        where: { userId: session.user.id }
    })

    if (accounts.length <= 1) {
        return { error: "Cannot unlink your only sign-in method. Please add another method first." }
    }

    // Find and delete the provider account
    const accountToDelete = accounts.find(a => a.provider === provider)

    if (!accountToDelete) {
        return { error: "Provider not linked" }
    }

    await prisma.account.delete({
        where: { id: accountToDelete.id }
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
}
