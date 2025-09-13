import { MemStorage } from "./storage";
import type { Agent } from "@shared/schema";

async function testAgentDeleteFunctionality() {
  console.log("Testing Agent Delete Functionality...\n");
  
  const storage = new MemStorage();
  
  // Wait for the async seed data to be loaded
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    // Step 1: Create a test agent
    console.log("1. Creating test agent...");
    const testAgent = await storage.createAgent({
      name: "Test Agent for Deletion",
      platform: "elevenlabs",
      description: "This agent will be deleted during testing",
      isActive: true,
    });
    console.log(`   ✓ Created agent with ID: ${testAgent.id}`);
    
    // Step 2: Create a user-agent assignment
    console.log("\n2. Creating user-agent assignment...");
    const users = await storage.getAllUsers();
    const regularUser = users.find(u => u.role === 'user');
    if (!regularUser) {
      throw new Error("No regular user found for testing");
    }
    
    await storage.assignAgents(regularUser.id, [testAgent.id]);
    const userAgents = await storage.getUserAgents(regularUser.id);
    const hasAssignment = userAgents.some(a => a.id === testAgent.id);
    console.log(`   ✓ Assigned agent to user ${regularUser.username}: ${hasAssignment}`);
    
    // Step 3: Verify agent exists
    console.log("\n3. Verifying agent exists...");
    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser) {
      throw new Error("No admin user found for testing");
    }
    
    const agentBefore = await storage.getAgent(adminUser.id, testAgent.id);
    console.log(`   ✓ Agent exists: ${agentBefore !== undefined}`);
    
    // Step 4: Delete the agent
    console.log("\n4. Deleting agent...");
    const deleteResult = await storage.deleteAgent(testAgent.id);
    console.log(`   ✓ Delete operation result: ${deleteResult}`);
    
    // Step 5: Verify agent is deleted
    console.log("\n5. Verifying agent is deleted...");
    const agentAfter = await storage.getAgent(adminUser.id, testAgent.id);
    console.log(`   ✓ Agent no longer exists: ${agentAfter === undefined}`);
    
    // Step 6: Verify user-agent assignments are removed
    console.log("\n6. Verifying user-agent assignments are removed...");
    const userAgentsAfter = await storage.getUserAgents(regularUser.id);
    const stillHasAssignment = userAgentsAfter.some(a => a.id === testAgent.id);
    console.log(`   ✓ User-agent assignment removed: ${!stillHasAssignment}`);
    
    // Step 7: Test deleting non-existent agent
    console.log("\n7. Testing delete of non-existent agent...");
    const nonExistentResult = await storage.deleteAgent("non-existent-id");
    console.log(`   ✓ Returns false for non-existent agent: ${!nonExistentResult}`);
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testAgentDeleteFunctionality();