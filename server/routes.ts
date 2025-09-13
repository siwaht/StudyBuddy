import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAgentSchema, insertCallSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // MOCK AUTH: For demo purposes, we'll use a mock user ID
  // In production, this would come from authentication middleware
  const getMockUserId = async () => {
    // For demo: use alice.johnson (admin) or bob.wilson (regular user)
    const mockUser = await storage.getUserByUsername("alice.johnson");
    return mockUser?.id || "mock-user-id";
  };

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Agent routes - WITH DATA ISOLATION
  app.get("/api/agents", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const agents = await storage.getAllAgents(userId);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const agent = await storage.getAgent(userId, req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found or access denied" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const agentData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ message: "Invalid agent data" });
    }
  });

  // Call routes - WITH DATA ISOLATION
  app.get("/api/calls", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const calls = await storage.getAllCalls(userId);
      
      // Get agents to include in response (only the ones user has access to)
      const agents = await storage.getAllAgents(userId);
      const agentsMap = new Map(agents.map(agent => [agent.id, agent]));
      
      const callsWithAgents = calls.map(call => ({
        ...call,
        agent: agentsMap.get(call.agentId),
      }));
      
      res.json(callsWithAgents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.get("/api/calls/:id", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const call = await storage.getCall(userId, req.params.id);
      if (!call) {
        return res.status(404).json({ message: "Call not found or access denied" });
      }

      // Get agent information (with user's access check)
      const agent = await storage.getAgent(userId, call.agentId);
      
      // Get performance metrics (filtered for user's access)
      const metrics = await storage.getPerformanceMetricsByCall(userId, call.id);
      
      res.json({
        ...call,
        agent,
        metrics,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  app.post("/api/calls", async (req, res) => {
    try {
      const callData = insertCallSchema.parse(req.body);
      const call = await storage.createCall(callData);
      res.status(201).json(call);
    } catch (error) {
      res.status(400).json({ message: "Invalid call data" });
    }
  });

  // LiveKit room routes - WITH DATA ISOLATION
  app.get("/api/livekit/rooms", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const rooms = await storage.getAllLiveKitRooms(userId);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch LiveKit rooms" });
    }
  });

  // Performance metrics routes - WITH DATA ISOLATION
  app.get("/api/metrics/agent/:agentId", async (req, res) => {
    try {
      const userId = await getMockUserId();
      const metrics = await storage.getPerformanceMetricsByAgent(userId, req.params.agentId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
