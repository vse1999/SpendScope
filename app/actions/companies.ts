"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Get all companies (for selection)
 */
export async function getAllCompanies() {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return companies;
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch companies",
    };
  }
}

/**
 * Create a new company and assign the current user as admin
 */
export async function createCompany(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!name || !slug) {
      return { error: "Company name and slug are required" };
    }

    // Validate slug format (alphanumeric, hyphens, underscores)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug.toLowerCase())) {
      return { error: "Slug must contain only lowercase letters, numbers, and hyphens" };
    }

    // Check if slug is already taken
    const existing = await prisma.company.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (existing) {
      return { error: "Company slug already taken" };
    }

    // Create company and update user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the company
      const company = await tx.company.create({
        data: {
          name: name.trim(),
          slug: slug.toLowerCase(),
        },
      });

      // Create default categories for the company
      const defaultCategories = [
        { name: "Office Supplies", color: "#3b82f6", icon: "Briefcase" },
        { name: "Travel", color: "#10b981", icon: "Plane" },
        { name: "Meals", color: "#f59e0b", icon: "Utensils" },
        { name: "Software", color: "#8b5cf6", icon: "Monitor" },
        { name: "Equipment", color: "#ef4444", icon: "Wrench" },
      ];

      await tx.category.createMany({
        data: defaultCategories.map((cat) => ({
          ...cat,
          companyId: company.id,
        })),
      });

      // Create free subscription for the company
      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });

      // Update user to be admin of the new company
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          companyId: company.id,
          role: "ADMIN",
        },
      });

      return company;
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true, company: result };
  } catch (error) {
    console.error("Failed to create company:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create company",
    };
  }
}

/**
 * Join an existing company
 */
export async function joinCompany(companyId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return { error: "Company not found" };
    }

    // Update user with company
    await prisma.user.update({
      where: { id: session.user.id },
      data: { companyId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true, company };
  } catch (error) {
    console.error("Failed to join company:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to join company",
    };
  }
}

/**
 * Check if user has a company
 */
export async function getUserCompany() {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    if (!session.user.companyId) {
      return { hasCompany: false };
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      return { hasCompany: false };
    }

    return { hasCompany: true, company };
  } catch (error) {
    console.error("Failed to get user company:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get company info",
    };
  }
}

/**
 * Leave current company
 */
export async function leaveCompany() {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { companyId: null },
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return { success: true };
  } catch (error) {
    console.error("Failed to leave company:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to leave company",
    };
  }
}
