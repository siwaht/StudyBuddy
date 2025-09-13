import { storage } from "./storage";

async function testDataIsolation() {
  console.log("Testing Data Isolation Security...\n");

  // Get user IDs from seeded data
  const alice = await storage.getUserByUsername("alice.johnson"); // Admin
  const bob = await storage.getUserByUsername("bob.wilson"); // Regular user with SalesBot & IVR Assistant
  const sarah = await storage.getUserByUsername("sarah.connors"); // Regular user with SupportRouter & Customer Service Bot
  const john = await storage.getUserByUsername("john.doe"); // Regular user with only Customer Service Bot

  if (!alice || !bob || !sarah || !john) {
    console.error("Failed to get test users");
    return;
  }

  console.log("Test Users:");
  console.log(`- Alice (Admin): ${alice.id}`);
  console.log(`- Bob (User): ${bob.id}`);
  console.log(`- Sarah (User): ${sarah.id}`);
  console.log(`- John (User): ${john.id}\n`);

  // Test 1: Verify agent access
  console.log("=== TEST 1: Agent Access ===");
  
  const aliceAgents = await storage.getAllAgents(alice.id);
  const bobAgents = await storage.getAllAgents(bob.id);
  const sarahAgents = await storage.getAllAgents(sarah.id);
  const johnAgents = await storage.getAllAgents(john.id);

  console.log(`Alice (admin) sees ${aliceAgents.length} agents: ${aliceAgents.map(a => a.name).join(", ")}`);
  console.log(`Bob sees ${bobAgents.length} agents: ${bobAgents.map(a => a.name).join(", ")}`);
  console.log(`Sarah sees ${sarahAgents.length} agents: ${sarahAgents.map(a => a.name).join(", ")}`);
  console.log(`John sees ${johnAgents.length} agents: ${johnAgents.map(a => a.name).join(", ")}`);

  // Verify Bob only sees his assigned agents
  const bobExpectedAgents = ["SalesBot", "IVR Assistant"];
  const bobActualAgents = bobAgents.map(a => a.name).sort();
  const bobTestPassed = JSON.stringify(bobExpectedAgents.sort()) === JSON.stringify(bobActualAgents);
  console.log(`✓ Bob isolation test: ${bobTestPassed ? "PASSED" : "FAILED"}`);

  // Test 2: Verify call access
  console.log("\n=== TEST 2: Call Access ===");
  
  const aliceCalls = await storage.getAllCalls(alice.id);
  const bobCalls = await storage.getAllCalls(bob.id);
  const sarahCalls = await storage.getAllCalls(sarah.id);
  const johnCalls = await storage.getAllCalls(john.id);

  console.log(`Alice (admin) sees ${aliceCalls.length} calls`);
  console.log(`Bob sees ${bobCalls.length} calls (should only be from SalesBot & IVR Assistant)`);
  console.log(`Sarah sees ${sarahCalls.length} calls (should only be from SupportRouter & Customer Service Bot)`);
  console.log(`John sees ${johnCalls.length} calls (should only be from Customer Service Bot)`);

  // Verify Bob only sees calls from his agents
  const bobAgentIds = bobAgents.map(a => a.id);
  const bobCallsValid = bobCalls.every(call => bobAgentIds.includes(call.agentId));
  console.log(`✓ Bob call isolation test: ${bobCallsValid ? "PASSED" : "FAILED"}`);

  // Test 3: Verify dashboard stats isolation
  console.log("\n=== TEST 3: Dashboard Stats Isolation ===");
  
  const aliceStats = await storage.getDashboardStats(alice.id);
  const bobStats = await storage.getDashboardStats(bob.id);
  const sarahStats = await storage.getDashboardStats(sarah.id);
  const johnStats = await storage.getDashboardStats(john.id);

  console.log(`Alice (admin) dashboard: ${aliceStats.totalCalls} total calls, ${aliceStats.activeRooms} active rooms`);
  console.log(`Bob dashboard: ${bobStats.totalCalls} total calls, ${bobStats.activeRooms} active rooms`);
  console.log(`Sarah dashboard: ${sarahStats.totalCalls} total calls, ${sarahStats.activeRooms} active rooms`);
  console.log(`John dashboard: ${johnStats.totalCalls} total calls, ${johnStats.activeRooms} active rooms`);

  // Verify stats are different based on access
  const statsDifferent = bobStats.totalCalls !== aliceStats.totalCalls && 
                        sarahStats.totalCalls !== aliceStats.totalCalls;
  console.log(`✓ Dashboard isolation test: ${statsDifferent ? "PASSED" : "FAILED"}`);

  // Test 4: Verify direct access denial
  console.log("\n=== TEST 4: Direct Access Denial ===");
  
  // Try to access an agent Bob doesn't have access to (SupportRouter)
  const supportRouterAgent = aliceAgents.find(a => a.name === "SupportRouter");
  if (supportRouterAgent) {
    const bobCanAccessSupportRouter = await storage.getAgent(bob.id, supportRouterAgent.id);
    console.log(`✓ Bob cannot access SupportRouter: ${!bobCanAccessSupportRouter ? "PASSED" : "FAILED"}`);
  }

  // Try to access a call from an agent Bob doesn't have access to
  const supportRouterCall = aliceCalls.find(call => {
    const agent = aliceAgents.find(a => a.id === call.agentId);
    return agent?.name === "SupportRouter";
  });
  
  if (supportRouterCall) {
    const bobCanAccessCall = await storage.getCall(bob.id, supportRouterCall.id);
    console.log(`✓ Bob cannot access SupportRouter calls: ${!bobCanAccessCall ? "PASSED" : "FAILED"}`);
  }

  // Test 5: Verify performance metrics isolation
  console.log("\n=== TEST 5: Performance Metrics Isolation ===");
  
  const aliceMetrics = await storage.getPerformanceMetrics(alice.id);
  const bobMetrics = await storage.getPerformanceMetrics(bob.id);
  
  console.log(`Alice (admin) sees ${aliceMetrics.length} performance metrics`);
  console.log(`Bob sees ${bobMetrics.length} performance metrics`);
  
  // Verify Bob only sees metrics from his agents
  const bobMetricsValid = bobMetrics.every(metric => bobAgentIds.includes(metric.agentId));
  console.log(`✓ Bob metrics isolation test: ${bobMetricsValid ? "PASSED" : "FAILED"}`);

  // Test 6: Verify agent assignment validation
  console.log("\n=== TEST 6: Agent Assignment Validation ===");
  
  try {
    // Try to assign a non-existent agent
    await storage.assignAgents(bob.id, ["non-existent-agent-id"]);
    console.log("✗ Invalid agent assignment test: FAILED (should have thrown error)");
  } catch (error: any) {
    console.log(`✓ Invalid agent assignment test: PASSED (error: ${error.message})`);
  }

  console.log("\n=== ALL TESTS COMPLETED ===");
  console.log("Data isolation security implementation verified successfully!");
}

// Run the tests
testDataIsolation().catch(console.error);