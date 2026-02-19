import { SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma-scripts";

const DEMO_COMPANY = {
  name: "DemoCorp",
  slug: "democorp",
} as const;

const DEMO_MONTHLY_BUDGET = 20_000;
const TARGET_EXPENSE_COUNT = 60;

const DEMO_USERS = [
  {
    name: "Alex Johnson",
    email: "alex.johnson@democorp.com",
    role: UserRole.ADMIN,
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@democorp.com",
    role: UserRole.MEMBER,
  },
  {
    name: "Michael Brown",
    email: "michael.brown@democorp.com",
    role: UserRole.MEMBER,
  },
  {
    name: "Emily Davis",
    email: "emily.davis@democorp.com",
    role: UserRole.MEMBER,
  },
  {
    name: "James Wilson",
    email: "james.wilson@democorp.com",
    role: UserRole.MEMBER,
  },
] as const;

const DEMO_CATEGORIES = [
  { name: "Travel", color: "#10b981", icon: "Plane" },
  { name: "Equipment", color: "#ef4444", icon: "Monitor" },
  { name: "Software", color: "#8b5cf6", icon: "Code" },
  { name: "Meals", color: "#f59e0b", icon: "Utensils" },
  { name: "Office Supplies", color: "#3b82f6", icon: "Package" },
] as const;

type DemoCategory = (typeof DEMO_CATEGORIES)[number];
type DemoCategoryName = DemoCategory["name"];

const EXPENSE_DESCRIPTIONS: Record<DemoCategoryName, readonly string[]> = {
  Travel: [
    "Flight to London conference",
    "Hotel booking - 2 nights",
    "Flight to Berlin meeting",
    "Taxi to airport",
    "Uber to client meeting",
    "Train ticket for business trip",
    "Car rental for site visit",
    "Parking fees downtown",
    "Flight to NYC summit",
    "Hotel accommodation - 3 nights",
  ],
  Equipment: [
    "Monitor stand and accessories",
    "Ergonomic keyboard",
    "Wireless mouse",
    "USB-C hub",
    "Webcam for remote meetings",
    "Noise-canceling headphones",
    "Standing desk converter",
    "Laptop stand",
  ],
  Software: [
    "Figma subscription",
    "Notion subscription",
    "Adobe Creative Cloud",
    "Slack Pro plan",
    "GitHub Copilot subscription",
    "Linear project management",
    "Vercel Pro hosting",
    "Cloud storage subscription",
  ],
  Meals: [
    "Team dinner",
    "Working dinner",
    "Client lunch",
    "Coffee with investor",
    "Team building lunch",
    "Breakfast meeting catering",
    "Working lunch",
    "Client dinner and drinks",
  ],
  "Office Supplies": [
    "Printer paper and ink",
    "Stationery items",
    "Whiteboard markers",
    "Filing cabinets",
    "Desk organizers",
    "Notebook and pens",
    "Printer cartridges",
    "Office cleaning supplies",
  ],
};

interface SeedUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomAmount(min: number, max: number): number {
  return Number(randomFloat(min, max).toFixed(2));
}

function randomDateWithinPastDays(totalDays: number): Date {
  const now = Date.now();
  const minTime = now - totalDays * 24 * 60 * 60 * 1000;
  const time = randomFloat(minTime, now);
  return new Date(time);
}

function pickRandom<T>(items: readonly T[]): T {
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

function amountRangeForCategory(categoryName: DemoCategoryName): {
  readonly min: number;
  readonly max: number;
} {
  switch (categoryName) {
    case "Travel":
      return { min: 50, max: 2_000 };
    case "Equipment":
      return { min: 30, max: 800 };
    case "Software":
      return { min: 20, max: 300 };
    case "Meals":
      return { min: 10, max: 240 };
    case "Office Supplies":
      return { min: 10, max: 220 };
  }
}

function pickExpenseUser(users: readonly SeedUser[]): SeedUser {
  const adminUser = users[0];
  const adminWeight = 0.35;
  if (Math.random() < adminWeight) {
    return adminUser;
  }

  return pickRandom(users);
}

async function seedCompany(): Promise<{ readonly id: string; readonly name: string }> {
  console.log("Setting up demo company...");

  const company = await prisma.company.upsert({
    where: { slug: DEMO_COMPANY.slug },
    update: { name: DEMO_COMPANY.name },
    create: {
      name: DEMO_COMPANY.name,
      slug: DEMO_COMPANY.slug,
    },
  });

  console.log(`  OK Company: ${company.name} (${company.id.slice(0, 8)}...)`);
  return company;
}

async function seedSubscription(companyId: string): Promise<void> {
  console.log("Setting up PRO subscription...");

  await prisma.subscription.upsert({
    where: { companyId },
    update: {
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      companyId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  console.log("  OK PRO subscription active");
}

async function seedBudget(companyId: string): Promise<void> {
  console.log("Setting up company budget...");

  await prisma.companyBudget.upsert({
    where: { companyId },
    update: {
      monthlyBudget: DEMO_MONTHLY_BUDGET,
      isActive: true,
    },
    create: {
      companyId,
      monthlyBudget: DEMO_MONTHLY_BUDGET,
      currency: "USD",
      isActive: true,
    },
  });

  console.log(`  OK Budget: $${DEMO_MONTHLY_BUDGET.toLocaleString()}/month`);
}

async function seedCategories(companyId: string): Promise<Record<DemoCategoryName, string>> {
  console.log("Setting up categories...");

  const categoryIdByName = {} as Record<DemoCategoryName, string>;

  for (const category of DEMO_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: {
        companyId_name: {
          companyId,
          name: category.name,
        },
      },
      update: {
        color: category.color,
        icon: category.icon,
      },
      create: {
        companyId,
        name: category.name,
        color: category.color,
        icon: category.icon,
      },
    });

    categoryIdByName[category.name] = record.id;
    console.log(`  OK ${record.name} (${record.color})`);
  }

  return categoryIdByName;
}

async function seedUsers(companyId: string): Promise<readonly SeedUser[]> {
  console.log("Setting up demo users...");

  const users: SeedUser[] = [];

  for (const user of DEMO_USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        companyId,
        name: user.name,
        role: user.role,
      },
      create: {
        companyId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    const roleLabel = user.role === UserRole.ADMIN ? "ADMIN" : "MEMBER";
    console.log(`  OK ${record.name ?? user.name} (${record.email}) - ${roleLabel}`);

    users.push({
      id: record.id,
      name: record.name ?? user.name,
      email: record.email,
    });
  }

  return users;
}

async function seedExpenses(
  companyId: string,
  categoryIdByName: Record<DemoCategoryName, string>,
  users: readonly SeedUser[]
): Promise<void> {
  console.log("Creating demo expenses...");

  const existingCount = await prisma.expense.count({
    where: { companyId },
  });

  if (existingCount >= TARGET_EXPENSE_COUNT) {
    console.log(`  INFO Already have ${existingCount} expenses. Skipping creation.`);
    return;
  }

  const createCount = TARGET_EXPENSE_COUNT - existingCount;
  const categoryNames = DEMO_CATEGORIES.map((category) => category.name);

  for (let index = 0; index < createCount; index += 1) {
    const categoryName = pickRandom(categoryNames);
    const description = pickRandom(EXPENSE_DESCRIPTIONS[categoryName]);
    const amountRange = amountRangeForCategory(categoryName);
    const amount = randomAmount(amountRange.min, amountRange.max);
    const user = pickExpenseUser(users);

    const created = await prisma.expense.create({
      data: {
        amount,
        categoryId: categoryIdByName[categoryName],
        companyId,
        date: randomDateWithinPastDays(60),
        description,
        userId: user.id,
      },
    });

    if (index < 5 || index >= createCount - 5) {
      console.log(`  OK $${created.amount.toFixed(2)} - ${created.description.slice(0, 45)}`);
    } else if (index === 5) {
      console.log(`  ... (${createCount - 10} more expenses)`);
    }
  }

  console.log(`  OK Created ${createCount} expenses`);
}

async function seedUsage(companyId: string): Promise<void> {
  console.log("Updating company usage metrics...");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const currentMonth = now.getFullYear() * 100 + (now.getMonth() + 1);

  const monthlyExpenseCount = await prisma.expense.count({
    where: {
      companyId,
      date: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
    },
  });

  await prisma.companyUsage.upsert({
    where: { companyId },
    update: {
      currentMonth,
      monthlyExpenses: monthlyExpenseCount,
      maxCategories: 0,
      maxExpenses: 0,
      maxUsers: 0,
    },
    create: {
      companyId,
      currentMonth,
      monthlyExpenses: monthlyExpenseCount,
      maxCategories: 0,
      maxExpenses: 0,
      maxUsers: 0,
    },
  });

  console.log(`  OK Usage updated for ${currentMonth} with ${monthlyExpenseCount} expenses`);
}

async function printSummary(companyId: string, teamSize: number): Promise<void> {
  const [categoryCount, expenseCount] = await Promise.all([
    prisma.category.count({ where: { companyId } }),
    prisma.expense.count({ where: { companyId } }),
  ]);

  console.log(`\n${"=".repeat(50)}`);
  console.log("DEMO DATA SEED COMPLETE");
  console.log("=".repeat(50));
  console.log(`Company:      ${DEMO_COMPANY.name}`);
  console.log("Plan:         PRO");
  console.log(`Budget:       $${DEMO_MONTHLY_BUDGET.toLocaleString()}/month`);
  console.log(`Team Members: ${teamSize}`);
  console.log(`Categories:   ${categoryCount}`);
  console.log(`Expenses:     ${expenseCount}`);
  console.log("=".repeat(50));
  console.log("\nDemo data is ready for screenshots.");
}

async function seedDemo(): Promise<void> {
  console.log("Starting professional demo data seed...\n");

  const company = await seedCompany();
  await seedSubscription(company.id);
  await seedBudget(company.id);

  const categoryIdByName = await seedCategories(company.id);
  const users = await seedUsers(company.id);

  await seedExpenses(company.id, categoryIdByName, users);
  await seedUsage(company.id);
  await printSummary(company.id, users.length);
}

seedDemo()
  .catch((error: unknown) => {
    console.error("\nDemo seed failed:");
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(String(error));
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
