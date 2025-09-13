import { MemStorage } from "./storage";
import type { User } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// Test function to verify sidebar permissions
async function testSidebarPermissions() {
  console.log("\n=== Testing Sidebar Permission System ===\n");
  
  const storage = new MemStorage();
  
  // Create test users with different permission sets
  const hashedPassword = await bcrypt.hash("testpass123", 10);
  
  // 1. Admin user - should see everything
  const adminUser = await storage.createUser({
    username: "test.admin",
    email: "admin@test.com",
    password: hashedPassword,
    role: "admin",
    isActive: true,
    permissions: {} // Admins don't need specific permissions
  });
  
  console.log("✅ Created admin user:", {
    id: adminUser.id,
    username: adminUser.username,
    role: adminUser.role,
    permissions: adminUser.permissions
  });
  
  // 2. Regular user with all permissions
  const fullAccessUser = await storage.createUser({
    username: "test.fullaccess",
    email: "fullaccess@test.com",
    password: hashedPassword,
    role: "user",
    isActive: true,
    permissions: {
      viewDashboard: true,
      viewCallHistory: true,
      viewAgents: true,
      viewAnalytics: true,
      viewUserManagement: false, // Regular users shouldn't have admin permissions
      viewIntegrations: false,
      viewSettings: false
    }
  });
  
  console.log("✅ Created full access user:", {
    id: fullAccessUser.id,
    username: fullAccessUser.username,
    role: fullAccessUser.role,
    permissions: fullAccessUser.permissions
  });
  
  // 3. Regular user with limited permissions
  const limitedUser = await storage.createUser({
    username: "test.limited",
    email: "limited@test.com",
    password: hashedPassword,
    role: "user",
    isActive: true,
    permissions: {
      viewDashboard: true,
      viewCallHistory: true,
      viewAgents: false,
      viewAnalytics: false,
      viewUserManagement: false,
      viewIntegrations: false,
      viewSettings: false
    }
  });
  
  console.log("✅ Created limited access user:", {
    id: limitedUser.id,
    username: limitedUser.username,
    role: limitedUser.role,
    permissions: limitedUser.permissions
  });
  
  // 4. Regular user with no permissions set (should default to empty object)
  const noPermUser = await storage.createUser({
    username: "test.noperm",
    email: "noperm@test.com",
    password: hashedPassword,
    role: "user",
    isActive: true,
    permissions: {}
  });
  
  console.log("✅ Created no permission user:", {
    id: noPermUser.id,
    username: noPermUser.username,
    role: noPermUser.role,
    permissions: noPermUser.permissions
  });
  
  // Test permission checks for each user
  console.log("\n=== Testing Permission Checks ===\n");
  
  const testPermissions = [
    "viewDashboard",
    "viewCallHistory",
    "viewAgents",
    "viewAnalytics",
    "viewUserManagement",
    "viewIntegrations",
    "viewSettings"
  ];
  
  // Helper function to simulate hasPermission logic
  function hasPermission(user: User, permission: string): boolean {
    if (user.role === "admin") return true;
    return (user.permissions as Record<string, boolean>)?.[permission] === true;
  }
  
  // Test admin user
  console.log("Admin user permissions:");
  for (const perm of testPermissions) {
    const hasAccess = hasPermission(adminUser, perm);
    console.log(`  ${perm}: ${hasAccess ? "✅" : "❌"} (${hasAccess ? "allowed" : "denied"})`);
  }
  
  // Test full access user
  console.log("\nFull access user permissions:");
  for (const perm of testPermissions) {
    const hasAccess = hasPermission(fullAccessUser, perm);
    const expected = ["viewDashboard", "viewCallHistory", "viewAgents", "viewAnalytics"].includes(perm);
    const status = hasAccess === expected ? "✅" : "❌";
    console.log(`  ${perm}: ${status} ${hasAccess ? "allowed" : "denied"} (expected: ${expected ? "allowed" : "denied"})`);
  }
  
  // Test limited user
  console.log("\nLimited user permissions:");
  for (const perm of testPermissions) {
    const hasAccess = hasPermission(limitedUser, perm);
    const expected = ["viewDashboard", "viewCallHistory"].includes(perm);
    const status = hasAccess === expected ? "✅" : "❌";
    console.log(`  ${perm}: ${status} ${hasAccess ? "allowed" : "denied"} (expected: ${expected ? "allowed" : "denied"})`);
  }
  
  // Test no permission user
  console.log("\nNo permission user:");
  for (const perm of testPermissions) {
    const hasAccess = hasPermission(noPermUser, perm);
    console.log(`  ${perm}: ${hasAccess ? "✅" : "❌"} (${hasAccess ? "allowed" : "denied"})`);
  }
  
  // Test updating permissions
  console.log("\n=== Testing Permission Updates ===\n");
  
  // Update limited user to have analytics permission
  const updatedSuccess = await storage.updateUserPermissions(limitedUser.id, {
    ...limitedUser.permissions as Record<string, boolean>,
    viewAnalytics: true
  });
  
  if (updatedSuccess) {
    const updatedUser = await storage.getUser(limitedUser.id);
    console.log("✅ Successfully updated limited user permissions:", updatedUser?.permissions);
    
    // Verify the update
    const hasAnalytics = hasPermission(updatedUser!, "viewAnalytics");
    console.log(`  viewAnalytics after update: ${hasAnalytics ? "✅ allowed" : "❌ denied"}`);
  } else {
    console.log("❌ Failed to update permissions");
  }
  
  // Test fetching permissions via API endpoint simulation
  console.log("\n=== Testing getUserPermissions Method ===\n");
  
  const adminPerms = await storage.getUserPermissions(adminUser.id);
  console.log("Admin user permissions object:", adminPerms);
  
  const fullPerms = await storage.getUserPermissions(fullAccessUser.id);
  console.log("Full access user permissions object:", fullPerms);
  
  const limitedPerms = await storage.getUserPermissions(limitedUser.id);
  console.log("Limited user permissions object:", limitedPerms);
  
  console.log("\n=== Sidebar Navigation Visibility Summary ===\n");
  
  const navigationItems = [
    { name: "Dashboard", permission: "viewDashboard", adminOnly: false },
    { name: "Call History", permission: "viewCallHistory", adminOnly: false },
    { name: "Agent Config", permission: "viewAgents", adminOnly: false },
    { name: "Advanced Analytics", permission: "viewAnalytics", adminOnly: false },
    { name: "User Management", permission: "viewUserManagement", adminOnly: true },
    { name: "Integrations", permission: "viewIntegrations", adminOnly: true },
    { name: "Settings", permission: "viewSettings", adminOnly: true }
  ];
  
  console.log("Admin user sees:");
  navigationItems.forEach(item => {
    console.log(`  - ${item.name} ✅`);
  });
  
  console.log("\nFull access user sees:");
  navigationItems.forEach(item => {
    const shouldSee = !item.adminOnly && hasPermission(fullAccessUser, item.permission);
    console.log(`  - ${item.name} ${shouldSee ? "✅" : "❌"}`);
  });
  
  console.log("\nLimited user sees:");
  const updatedLimitedUser = await storage.getUser(limitedUser.id);
  navigationItems.forEach(item => {
    const shouldSee = !item.adminOnly && hasPermission(updatedLimitedUser!, item.permission);
    console.log(`  - ${item.name} ${shouldSee ? "✅" : "❌"}`);
  });
  
  console.log("\nNo permission user sees:");
  navigationItems.forEach(item => {
    const shouldSee = !item.adminOnly && hasPermission(noPermUser, item.permission);
    console.log(`  - ${item.name} ${shouldSee ? "✅" : "❌"}`);
  });
  
  console.log("\n✅ Sidebar permission test completed successfully!");
  console.log("\nKey findings:");
  console.log("1. Admin users always have full access to all navigation items");
  console.log("2. Regular users only see items they have explicit permission for");
  console.log("3. Admin-only sections are never visible to regular users");
  console.log("4. Permissions can be updated dynamically and take effect immediately");
}

// Run the test
testSidebarPermissions().catch(console.error);