import { SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma-scripts";

const DEMO_COMPANY = {
  name: "DemoCorp",
  slug: "democorp",
} as const;

const DEMO_MONTHLY_BUDGET = 20_000;
const DEFAULT_SEED = 20_260_309;
const DEFAULT_REFERENCE_DATE = "2026-03-01";
const MONTH_BUCKETS = 6;
const EXPENSES_PER_MONTH = 10;

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

interface SeedOptions {
  readonly seed: number;
  readonly referenceDate: Date;
}

interface SeedExpenseRecord {
  readonly amount: number;
  readonly categoryId: string;
  readonly companyId: string;
  readonly date: Date;
  readonly description: string;
  readonly userId: string;
}

class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  public next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  public pick<T>(items: readonly T[]): T {
    const index = Math.floor(this.next() * items.length);
    return items[index];
  }

  public intInclusive(min: number, max: number): number {
    const span = max - min + 1;
    return min + Math.floor(this.next() * span);
  }
}

function parsePositiveInteger(rawValue: string, flagName: string): number {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer. Received: ${rawValue}`);
  }
  return parsed;
}

function parseReferenceDate(rawValue: string): Date {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDatePattern.test(rawValue)) {
    throw new Error(
      `--reference-date must use YYYY-MM-DD format. Received: ${rawValue}`
    );
  }

  const parsed = new Date(`${rawValue}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`--reference-date is invalid: ${rawValue}`);
  }

  return parsed;
}

function parseCliOptions(argv: readonly string[]): SeedOptions {
  let seed = DEFAULT_SEED;
  let referenceDate = parseReferenceDate(DEFAULT_REFERENCE_DATE);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--seed") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value after --seed");
      }
      seed = parsePositiveInteger(value, "--seed");
      index += 1;
      continue;
    }

    if (token.startsWith("--seed=")) {
      seed = parsePositiveInteger(token.slice("--seed=".length), "--seed");
      continue;
    }

    if (token === "--reference-date") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value after --reference-date");
      }
      referenceDate = parseReferenceDate(value);
      index += 1;
      continue;
    }

    if (token.startsWith("--reference-date=")) {
      referenceDate = parseReferenceDate(token.slice("--reference-date=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return { seed, referenceDate };
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

function amountForCategory(
  categoryName: DemoCategoryName,
  rng: SeededRng
): number {
  const range = amountRangeForCategory(categoryName);
  const value = range.min + rng.next() * (range.max - range.min);
  return Number(value.toFixed(2));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0));
}

function addUtcMonths(date: Date, monthOffset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1, 12, 0, 0)
  );
}

function daysInUtcMonth(monthStart: Date): number {
  return new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

function randomDateInUtcMonth(monthStart: Date, rng: SeededRng): Date {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const day = rng.intInclusive(1, daysInUtcMonth(monthStart));
  const hour = rng.intInclusive(8, 18);
  const minute = rng.intInclusive(0, 59);
  return new Date(Date.UTC(year, month, day, hour, minute, 0));
}

function pickExpenseUser(users: readonly SeedUser[], rng: SeededRng): SeedUser {
  const adminUser = users[0];
  const adminWeight = 0.35;

  if (users.length === 1 || rng.next() < adminWeight) {
    return adminUser;
  }

  const memberIndex = rng.intInclusive(1, users.length - 1);
  return users[memberIndex];
}

function buildDeterministicExpenseRecords(
  companyId: string,
  categoryIdByName: Record<DemoCategoryName, string>,
  users: readonly SeedUser[],
  options: SeedOptions
): readonly SeedExpenseRecord[] {
  const rng = new SeededRng(options.seed);
  const categoryNames = DEMO_CATEGORIES.map((category) => category.name);
  const newestMonth = startOfUtcMonth(options.referenceDate);
  const oldestMonth = addUtcMonths(newestMonth, -(MONTH_BUCKETS - 1));
  const records: SeedExpenseRecord[] = [];

  for (let monthOffset = 0; monthOffset < MONTH_BUCKETS; monthOffset += 1) {
    const monthStart = addUtcMonths(oldestMonth, monthOffset);

    for (let slot = 0; slot < EXPENSES_PER_MONTH; slot += 1) {
      const categoryName = categoryNames[(monthOffset + slot) % categoryNames.length];
      const description = rng.pick(EXPENSE_DESCRIPTIONS[categoryName]);
      const amount = amountForCategory(categoryName, rng);
      const user = pickExpenseUser(users, rng);

      records.push({
        amount,
        categoryId: categoryIdByName[categoryName],
        companyId,
        date: randomDateInUtcMonth(monthStart, rng),
        description,
        userId: user.id,
      });
    }
  }

  return records;
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
  users: readonly SeedUser[],
  options: SeedOptions
): Promise<void> {
  console.log("Creating deterministic demo expenses...");

  const records = buildDeterministicExpenseRecords(
    companyId,
    categoryIdByName,
    users,
    options
  );

  await prisma.expense.deleteMany({
    where: { companyId },
  });

  await prisma.expense.createMany({
    data: [...records],
  });

  const oldestMonth = addUtcMonths(startOfUtcMonth(options.referenceDate), -(MONTH_BUCKETS - 1));
  const newestMonth = startOfUtcMonth(options.referenceDate);

  console.log(
    `  OK Created ${records.length} expenses across ${MONTH_BUCKETS} months (${oldestMonth
      .toISOString()
      .slice(0, 10)} to ${newestMonth.toISOString().slice(0, 10)})`
  );
}

async function seedUsage(companyId: string, referenceDate: Date): Promise<void> {
  console.log("Updating company usage metrics...");

  const startOfMonth = startOfUtcMonth(referenceDate);
  const startOfNextMonth = addUtcMonths(startOfMonth, 1);
  const currentMonth = startOfMonth.getUTCFullYear() * 100 + (startOfMonth.getUTCMonth() + 1);

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

async function printSummary(
  companyId: string,
  teamSize: number,
  options: SeedOptions
): Promise<void> {
  const [categoryCount, expenseCount] = await Promise.all([
    prisma.category.count({ where: { companyId } }),
    prisma.expense.count({ where: { companyId } }),
  ]);

  console.log(`\n${"=".repeat(50)}`);
  console.log("DEMO DATA SEED COMPLETE");
  console.log("=".repeat(50));
  console.log(`Company:        ${DEMO_COMPANY.name}`);
  console.log("Plan:           PRO");
  console.log(`Budget:         $${DEMO_MONTHLY_BUDGET.toLocaleString()}/month`);
  console.log(`Team Members:   ${teamSize}`);
  console.log(`Categories:     ${categoryCount}`);
  console.log(`Expenses:       ${expenseCount}`);
  console.log(`Seed:           ${options.seed}`);
  console.log(
    `Reference date: ${options.referenceDate.toISOString().slice(0, 10)} (UTC month window)`
  );
  console.log("=".repeat(50));
  console.log("\nDemo data is ready for screenshots.");
}

async function seedDemo(options: SeedOptions): Promise<void> {
  console.log("Starting deterministic professional demo data seed...\n");
  console.log(`Seed: ${options.seed}`);
  console.log(`Reference date: ${options.referenceDate.toISOString().slice(0, 10)}\n`);

  const company = await seedCompany();
  await seedSubscription(company.id);
  await seedBudget(company.id);

  const categoryIdByName = await seedCategories(company.id);
  const users = await seedUsers(company.id);

  await seedExpenses(company.id, categoryIdByName, users, options);
  await seedUsage(company.id, options.referenceDate);
  await printSummary(company.id, users.length, options);
}

const cliOptions = parseCliOptions(process.argv.slice(2));

seedDemo(cliOptions)
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
