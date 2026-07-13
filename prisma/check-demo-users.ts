import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking for demo users...\n");

  const demoUsers = await prisma.user.findMany({
    where: {
      email: {
        contains: "@talentorx.local"
      }
    },
    select: {
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isApproved: true
    },
    orderBy: {
      role: 'asc'
    }
  });

  if (demoUsers.length === 0) {
    console.log("❌ No demo users found.");
    console.log("Run: npm run db:seed-demo");
  } else {
    console.log(`✅ Found ${demoUsers.length} demo users:\n`);
    demoUsers.forEach((user) => {
      console.log(`- ${user.email} | ${user.role} | ${user.firstName} ${user.lastName}`);
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
