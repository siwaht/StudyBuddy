import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAgentSchema, insertCallSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
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

  // Agent routes
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
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

  // Call routes
  app.get("/api/calls", async (req, res) => {
    try {
      const calls = await storage.getAllCalls();
      
      // Get agents to include in response
      const agents = await storage.getAllAgents();
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
      const call = await storage.getCall(req.params.id);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Get agent information
      const agent = await storage.getAgent(call.agentId);
      
      // Get performance metrics
      const metrics = await storage.getPerformanceMetricsByCall(call.id);
      
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

  // LiveKit room routes
  app.get("/api/livekit/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllLiveKitRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch LiveKit rooms" });
    }
  });

  // Performance metrics routes
  app.get("/api/metrics/agent/:agentId", async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetricsByAgent(req.params.agentId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
