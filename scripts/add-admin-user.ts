import bcrypt from "bcrypt";
import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function addAdminUser() {
  try {
    // Get credentials from environment variables (secure for production)
    // In development, use defaults if env vars not provided
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    const email = process.env.ADMIN_EMAIL || (isDevelopment ? "cc@siwaht.com" : undefined);
    const password = process.env.ADMIN_PASSWORD || (isDevelopment ? "Hola173!" : undefined);
    const username = process.env.ADMIN_USERNAME || (isDevelopment ? "cc.siwaht" : undefined);
    
    if (!email || !password || !username) {
      console.error("❌ Error: Missing required environment variables in production mode");
      console.error("Required: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME");
      process.exit(1);
    }

    // Hash the password (10 rounds to match auth.ts)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the new admin user with conflict handling
    // Using onConflictDoNothing to make it idempotent and safe to re-run
    const result = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      permissions: {
        canManageUsers: true,
        canManageAgents: true,
        canViewAnalytics: true,
        canExportData: true,
        canManageIntegrations: true,
        canViewAllCalls: true,
        canDeleteCalls: true,
        canManageWebhooks: true,
        canManageApiKeys: true,
        canViewBilling: true
      },
      lastActive: new Date()
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

    if (result.length > 0) {
      console.log("✅ Admin user created successfully!");
      console.log("Email:", email);
      console.log("Role: admin");
      console.log("User ID:", result[0].id);
      if (isDevelopment) {
        console.log("⚠️  Development mode - Remember to change the password in production!");
      }
    } else {
      console.log("ℹ️  User with email", email, "already exists - no changes made");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

addAdminUser();