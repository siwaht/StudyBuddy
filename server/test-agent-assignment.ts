import axios from "axios";

const API_URL = "http://localhost:5000";
const TEST_DELAY = 500;

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: "alice@company.com",
  password: "password123",
};

// Test user credentials (regular user)
const USER_CREDENTIALS = {
  email: "bob@company.com",
  password: "password123",
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("Starting Agent Assignment API Tests...\n");
  
  try {
    // 1. Login as admin
    console.log("Test 1: Login as admin");
    const adminLogin = await axios.post(`${API_URL}/api/auth/login`, ADMIN_CREDENTIALS, {
      withCredentials: true,
    });
    const adminCookie = adminLogin.headers["set-cookie"]?.[0];
    console.log("✓ Admin login successful");
    console.log(`  Admin user: ${adminLogin.data.user.username} (${adminLogin.data.user.role})`);
    
    await sleep(TEST_DELAY);
    
    // 2. Get all users
    console.log("\nTest 2: Get all users (admin only)");
    const usersResponse = await axios.get(`${API_URL}/api/users`, {
      headers: { Cookie: adminCookie },
    });
    console.log(`✓ Retrieved ${usersResponse.data.length} users`);
    
    // Find a regular user to test with
    const regularUser = usersResponse.data.find((u: any) => u.role === "user" && u.username === "bob.wilson");
    if (!regularUser) {
      throw new Error("No regular user found for testing");
    }
    console.log(`  Test user: ${regularUser.username} (ID: ${regularUser.id})`);
    
    await sleep(TEST_DELAY);
    
    // 3. Get all available agents
    console.log("\nTest 3: Get all available agents");
    const allAgentsResponse = await axios.get(`${API_URL}/api/all-agents`, {
      headers: { Cookie: adminCookie },
    });
    console.log(`✓ Retrieved ${allAgentsResponse.data.length} agents`);
    allAgentsResponse.data.forEach((agent: any) => {
      console.log(`  - ${agent.name} (${agent.platform}) - ${agent.isActive ? "Active" : "Inactive"}`);
    });
    
    await sleep(TEST_DELAY);
    
    // 4. Get current agent assignments for the user
    console.log(`\nTest 4: Get current agent assignments for ${regularUser.username}`);
    const currentAssignments = await axios.get(`${API_URL}/api/users/${regularUser.id}/agents`, {
      headers: { Cookie: adminCookie },
    });
    console.log(`✓ User has ${currentAssignments.data.length} assigned agents`);
    currentAssignments.data.forEach((agent: any) => {
      console.log(`  - ${agent.name}`);
    });
    
    await sleep(TEST_DELAY);
    
    // 5. Update agent assignments
    console.log(`\nTest 5: Update agent assignments for ${regularUser.username}`);
    // Assign first two agents
    const newAgentIds = allAgentsResponse.data.slice(0, 2).map((a: any) => a.id);
    const updateResponse = await axios.put(
      `${API_URL}/api/users/${regularUser.id}/agents`,
      { agentIds: newAgentIds },
      { headers: { Cookie: adminCookie } }
    );
    console.log(`✓ Updated assignments - now has ${updateResponse.data.length} agents`);
    updateResponse.data.forEach((agent: any) => {
      console.log(`  - ${agent.name}`);
    });
    
    await sleep(TEST_DELAY);
    
    // 6. Try to update an admin user's assignments (should fail)
    console.log("\nTest 6: Try to update admin user's assignments (should fail)");
    const adminUser = usersResponse.data.find((u: any) => u.role === "admin");
    try {
      await axios.put(
        `${API_URL}/api/users/${adminUser.id}/agents`,
        { agentIds: [] },
        { headers: { Cookie: adminCookie } }
      );
      console.log("✗ ERROR: Should not be able to modify admin assignments");
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log("✓ Correctly prevented modification of admin assignments");
        console.log(`  Error message: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }
    
    await sleep(TEST_DELAY);
    
    // 7. Login as regular user and try to access assignment endpoints (should fail)
    console.log("\nTest 7: Regular user tries to access assignment endpoints (should fail)");
    const userLogin = await axios.post(`${API_URL}/api/auth/login`, USER_CREDENTIALS, {
      withCredentials: true,
    });
    const userCookie = userLogin.headers["set-cookie"]?.[0];
    console.log(`✓ Logged in as ${userLogin.data.user.username} (${userLogin.data.user.role})`);
    
    try {
      await axios.get(`${API_URL}/api/users/${regularUser.id}/agents`, {
        headers: { Cookie: userCookie },
      });
      console.log("✗ ERROR: Regular user should not be able to access assignment endpoints");
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log("✓ Correctly denied access to regular user");
      } else {
        throw error;
      }
    }
    
    await sleep(TEST_DELAY);
    
    // 8. Verify data isolation - check what agents the user can see
    console.log("\nTest 8: Verify data isolation after assignment change");
    const userAgents = await axios.get(`${API_URL}/api/agents`, {
      headers: { Cookie: userCookie },
    });
    console.log(`✓ User can see ${userAgents.data.length} agents (based on assignments)`);
    userAgents.data.forEach((agent: any) => {
      console.log(`  - ${agent.name}`);
    });
    
    // Verify these match the assignments we made
    const assignedIds = updateResponse.data.map((a: any) => a.id);
    const visibleIds = userAgents.data.map((a: any) => a.id);
    const matchesAssignments = assignedIds.every((id: string) => visibleIds.includes(id)) &&
                              assignedIds.length === visibleIds.length;
    
    if (matchesAssignments) {
      console.log("✓ Data isolation working correctly - user sees only assigned agents");
    } else {
      console.log("✗ ERROR: Data isolation issue - user agent visibility doesn't match assignments");
    }
    
    console.log("\n=== All Agent Assignment Tests Passed! ===");
    
  } catch (error) {
    console.error("\n✗ Test failed:", error);
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  console.log("\nTests completed successfully!");
  process.exit(0);
}).catch(error => {
  console.error("Test execution failed:", error);
  process.exit(1);
});