import { prisma } from "@/lib/prisma"

async function unlinkGitHub() {
    const user = await prisma.user.findUnique({
        where: { email: "vsebo99@gmail.com" },
        include: { accounts: true }
    })

    if (!user) {
        console.log("User not found")
        return
    }

    const githubAccount = user.accounts.find(a => a.provider === "github")
    
    if (!githubAccount) {
        console.log("GitHub not linked for this user")
        return
    }

    await prisma.account.delete({
        where: { id: githubAccount.id }
    })

    console.log("✅ GitHub account unlinked successfully")
    console.log(`User: ${user.email}`)
    console.log(`Provider: ${githubAccount.provider}`)
}

unlinkGitHub()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
