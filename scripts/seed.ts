// Load env vars BEFORE anything else
import { config } from "dotenv";
config({ path: ".env.local" });

// Use direct Prisma setup for seed script (avoid singleton caching issues)
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { UserRole } from "@prisma/client";

const CATEGORIES = [
  { name: "Food", color: "#ef4444" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Utilities", color: "#10b981" },
  { name: "Entertainment", color: "#f59e0b" },
  { name: "Office", color: "#8b5cf6" },
];

const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  Food: [
    "Lunch at Starbucks",
    "Team dinner at Italian restaurant",
    "Coffee with client",
    "Groceries for office pantry",
    "Breakfast meeting catering",
    "Uber Eats delivery",
    "Sandwiches for working lunch",
  ],
  Transport: [
    "Uber to meeting",
    "Lyft from airport",
    "Parking fees downtown",
    "Taxi to conference",
    "Train ticket for business trip",
    "Car rental for site visit",
    "Gas reimbursement",
    "Toll fees",
  ],
  Utilities: [
    "Monthly electricity bill",
    "Internet service payment",
    "Water bill",
    "Phone bill reimbursement",
    "Cloud storage subscription",
    "Software license renewal",
  ],
  Entertainment: [
    "Client dinner and drinks",
    "Team building activity",
    "Movie tickets for team outing",
    "Concert tickets",
    "Karaoke night",
    "Bowling with clients",
  ],
  Office: [
    "Printer paper and ink",
    "Office chairs",
    "Whiteboard markers",
    "Stationery supplies",
    "Desk lamp",
    "Ergonomic keyboard",
    "Monitor stand",
    "Filing cabinets",
  ],
};

function getRandomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return pastDate;
}

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // 1. Create or find Test Company
  console.log("🏢 Setting up company...");
  const company = await prisma.company.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
    },
  });
  console.log(`   ✅ Company: ${company.name} (${company.id.substring(0, 8)}...)`);

  // 2. Create Categories
  console.log("\n📁 Setting up categories...");
  const categoryMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: cat.name,
        },
      },
      update: {},
      create: {
        name: cat.name,
        color: cat.color,
        companyId: company.id,
      },
    });
    categoryMap[cat.name] = category.id;
    console.log(`   ✅ ${category.name} (${category.color})`);
  }

  // 3. Create Test User (if none exists)
  console.log("\n👤 Setting up test user...");
  const testEmail = "admin@acme-corp.com";

  let user = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Test Admin",
        email: testEmail,
        role: UserRole.ADMIN,
        companyId: company.id,
      },
    });
    console.log(`   ✅ Created: ${user.name} (${user.email})`);
  } else {
    console.log(`   ℹ️  Exists: ${user.name} (${user.email})`);
  }

  // 4. Create Expenses
  console.log("\n💰 Creating expenses...");
  const expenseCount = await prisma.expense.count({
    where: { companyId: company.id },
  });

  if (expenseCount >= 20) {
    console.log(`   ℹ️  Already have ${expenseCount} expenses. Skipping.`);
  } else {
    const categories = Object.keys(categoryMap);
    const expensesToCreate = 20 - expenseCount;

    for (let i = 0; i < expensesToCreate; i++) {
      const categoryName = categories[Math.floor(Math.random() * categories.length)];
      const descriptions = EXPENSE_DESCRIPTIONS[categoryName];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const amount = getRandomAmount(5, 500);
      const date = getRandomDate(30);

      const expense = await prisma.expense.create({
        data: {
          amount,
          description,
          date,
          categoryId: categoryMap[categoryName],
          userId: user.id,
          companyId: company.id,
        },
      });

      console.log(`   ✅ $${expense.amount.toFixed(2)} - ${expense.description.substring(0, 40)}`);
    }
    console.log(`\n   Created ${expensesToCreate} new expenses.`);
  }

  // Summary
  const finalExpenseCount = await prisma.expense.count({
    where: { companyId: company.id },
  });
  const finalCategoryCount = await prisma.category.count({
    where: { companyId: company.id },
  });

  console.log("\n📊 Seed Summary:");
  console.log("   ══════════════════════════");
  console.log(`   Company:      ${company.name}`);
  console.log(`   Categories:   ${finalCategoryCount}`);
  console.log(`   User:         ${user.name}`);
  console.log(`   Expenses:     ${finalExpenseCount}`);
  console.log("   ══════════════════════════");
  console.log("\n✨ Seed completed successfully!");
}

seed()
  .catch((error) => {
    console.error("\n❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
