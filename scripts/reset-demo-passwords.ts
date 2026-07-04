/**
 * Reset Demo User Passwords Script
 * 
 * This script resets all seeded/demo user passwords to a standard test password.
 * 
 * SAFETY FEATURES:
 * - Only runs in development environment
 * - Requires explicit confirmation flag
 * - Does not affect production databases
 * - Only updates users created by seed script
 * - Prints detailed report of changes
 * 
 * USAGE:
 *   npm run reset-demo-passwords
 * 
 * REQUIREMENTS:
 *   - NODE_ENV must be 'development' OR
 *   - DEMO_PASSWORD_RESET_ALLOWED must be 'true'
 * 
 * WARNING: This script will reset passwords for all demo users!
 */

import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 12;

// New standard password for all demo users
const NEW_DEMO_PASSWORD = "Test@123";

// List of demo user emails (from seed.ts)
const DEMO_USER_EMAILS = [
  // Super Admin
  "admin@campushire.in",
  
  // College Admins
  "admin@iitd.ac.in",
  "admin@iima.ac.in",
  
  // Students (20 total)
  "aarav.sharma@student.campushire.in",
  "ishita.gupta@student.campushire.in",
  "rohan.verma@student.campushire.in",
  "priya.nair@student.campushire.in",
  "kartik.reddy@student.campushire.in",
  "meera.iyer@student.campushire.in",
  "aditya.mishra@student.campushire.in",
  "sneha.kapoor@student.campushire.in",
  "yash.joshi@student.campushire.in",
  "naina.saxena@student.campushire.in",
  "vikram.bhatia@student.campushire.in",
  "ananya.menon@student.campushire.in",
  "kabir.dubey@student.campushire.in",
  "ritika.chopra@student.campushire.in",
  "dev.mehta@student.campushire.in",
  "sanya.malhotra@student.campushire.in",
  "harsh.pillai@student.campushire.in",
  "pooja.singh@student.campushire.in",
  "arjun.agarwal@student.campushire.in",
  "tanvi.kulkarni@student.campushire.in",
  
  // Corporate Recruiters
  "recruiter@techcorp.in",
  "recruiter@financehub.in",
  "recruiter@designstudio.in",
  
  // Freelance Recruiter
  "freelance@campushire.in",
  
  // Vendor
  "vendor@docsure.in",
  
  // Training Partner
  "partner@skillforge.in",
];

interface ResetResult {
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  success: boolean;
  error?: string;
}

/**
 * Check if the script is allowed to run
 */
function checkEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV;
  const resetAllowed = process.env.DEMO_PASSWORD_RESET_ALLOWED;

  console.log("\n🔒 Environment Check:");
  console.log(`   NODE_ENV: ${nodeEnv || "not set"}`);
  console.log(`   DEMO_PASSWORD_RESET_ALLOWED: ${resetAllowed || "not set"}`);

  if (nodeEnv !== "development" && resetAllowed !== "true") {
    console.error("\n❌ ERROR: This script can only run in development environment!");
    console.error("\n   To run this script, either:");
    console.error("   1. Set NODE_ENV=development, OR");
    console.error("   2. Set DEMO_PASSWORD_RESET_ALLOWED=true");
    console.error("\n   This is a safety measure to prevent accidental production password resets.");
    process.exit(1);
  }

  console.log("✅ Environment check passed\n");
}

/**
 * Prompt user for confirmation
 */
async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log("⚠️  WARNING: This will reset passwords for all demo users!");
    console.log(`   New password will be: ${NEW_DEMO_PASSWORD}`);
    console.log(`   Total users to update: ${DEMO_USER_EMAILS.length}`);
    console.log("");
    
    rl.question("   Do you want to continue? (yes/no): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Hash the new password
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

/**
 * Reset password for a single user
 */
async function resetUserPassword(email: string, newPasswordHash: string): Promise<ResetResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return {
        email,
        role: UserRole.STUDENT, // default
        firstName: "",
        lastName: "",
        success: false,
        error: "User not found",
      };
    }

    await prisma.user.update({
      where: { email },
      data: { passwordHash: newPasswordHash },
    });

    return {
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      success: true,
    };
  } catch (error) {
    return {
      email,
      role: UserRole.STUDENT, // default
      firstName: "",
      lastName: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Print results summary
 */
function printResults(results: ResetResult[]): void {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("\n" + "=".repeat(80));
  console.log("📊 RESET SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total users processed: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log("=".repeat(80));

  if (successful.length > 0) {
    console.log("\n✅ SUCCESSFULLY RESET PASSWORDS:");
    console.log("-".repeat(80));
    
    // Group by role
    const byRole: Record<string, ResetResult[]> = {};
    successful.forEach((result) => {
      if (!byRole[result.role]) {
        byRole[result.role] = [];
      }
      byRole[result.role].push(result);
    });

    Object.entries(byRole).forEach(([role, users]) => {
      console.log(`\n${role} (${users.length}):`);
      users.forEach((user) => {
        console.log(`  • ${user.firstName} ${user.lastName} <${user.email}>`);
      });
    });
  }

  if (failed.length > 0) {
    console.log("\n❌ FAILED TO RESET:");
    console.log("-".repeat(80));
    failed.forEach((result) => {
      console.log(`  • ${result.email}: ${result.error}`);
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log(`🔑 New password for all reset users: ${NEW_DEMO_PASSWORD}`);
  console.log("=".repeat(80) + "\n");
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("🔄 DEMO PASSWORD RESET SCRIPT");
  console.log("=".repeat(80) + "\n");

  // Step 1: Check environment
  checkEnvironment();

  // Step 2: Get user confirmation
  const confirmed = await confirmReset();
  if (!confirmed) {
    console.log("\n❌ Reset cancelled by user.\n");
    process.exit(0);
  }

  console.log("\n🔄 Starting password reset...\n");

  // Step 3: Hash the new password
  console.log("🔐 Hashing new password...");
  const newPasswordHash = await hashPassword(NEW_DEMO_PASSWORD);
  console.log("✅ Password hashed\n");

  // Step 4: Reset passwords
  console.log("🔄 Resetting passwords for demo users...");
  const results: ResetResult[] = [];

  for (const email of DEMO_USER_EMAILS) {
    process.stdout.write(`   Processing: ${email}...`);
    const result = await resetUserPassword(email, newPasswordHash);
    results.push(result);
    console.log(result.success ? " ✅" : " ❌");
  }

  // Step 5: Print results
  printResults(results);

  console.log("✅ Password reset complete!\n");
}

// Execute the script
main()
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
