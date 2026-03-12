"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function unlinkProvider(provider: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Not authenticated" }
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
