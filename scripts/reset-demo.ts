import { prisma } from "../lib/prisma-scripts";

const DEMO_COMPANY_SLUG = "democorp";
const DEMO_USER_EMAILS = [
  "alex.johnson@democorp.com",
  "sarah.chen@democorp.com",
  "michael.brown@democorp.com",
  "emily.davis@democorp.com",
  "james.wilson@democorp.com",
] as const;

async function resetDemo(): Promise<void> {
  console.log("Starting demo data cleanup...\n");

  console.log("Removing demo company...");
  const deletedCompany = await prisma.company.deleteMany({
    where: { slug: DEMO_COMPANY_SLUG },
  });
  console.log(`  OK Deleted ${deletedCompany.count} company records`);

  console.log("\nRemoving demo users...");
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        in: [...DEMO_USER_EMAILS],
      },
    },
  });
  console.log(`  OK Deleted ${deletedUsers.count} users`);

  console.log(`\n${"=".repeat(50)}`);
  console.log("DEMO DATA CLEANUP COMPLETE");
  console.log("=".repeat(50));
  console.log(`Company rows deleted: ${deletedCompany.count}`);
  console.log(`User rows deleted:    ${deletedUsers.count}`);
  console.log("=".repeat(50));
  console.log("\nTo recreate demo data run: npm run seed:demo");
}

resetDemo()
  .catch((error: unknown) => {
    console.error("\nDemo reset failed:");
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
