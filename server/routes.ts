import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAgentSchema, insertCallSchema } from "@shared/schema";
import { hashPassword, validatePassword, requireAuth, requireAdmin } from "./auth";
import { z } from "zod";
import * as livekit from "./livekit";
import { elevenLabsIntegration } from "./integrations/elevenlabs";
import { encrypt, decrypt } from "./utils/crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }
      
      const isValid = await validatePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        // Set user ID on the new session
        req.session.userId = user.id;
        
        // Save the session
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          // Update last active time
          storage.updateUser(user.id, { lastActive: new Date() });
          
          const { password: _, ...userWithoutPassword } = user;
          res.json({ user: userWithoutPassword });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", requireAuth, async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });
  
  app.post("/api/auth/register", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });
  
  app.patch("/api/auth/password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      // Validate current password
      const isValid = await storage.validatePassword(req.user!.id, currentPassword);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updatePassword(req.user!.id, hashedPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Dashboard routes - Protected
  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User routes - Admin only
  app.get("/api/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
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

  app.post("/api/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash the password before storing
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
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

  // User Permissions routes - Admin only
  app.get("/api/users/:userId/permissions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user permissions
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  app.put("/api/users/:userId/permissions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const permissions = req.body;
      
      // Validate permissions is an object with boolean values
      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ message: "Invalid permissions format" });
      }
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow modifying admin permissions (they always have full access)
      if (user.role === 'admin') {
        return res.status(400).json({ message: "Cannot modify admin permissions" });
      }
      
      // Update user permissions
      const success = await storage.updateUserPermissions(userId, permissions);
      if (!success) {
        return res.status(500).json({ message: "Failed to update permissions" });
      }
      
      res.json({ message: "Permissions updated successfully", permissions });
    } catch (error) {
      console.error('Error updating user permissions:', error);
      res.status(500).json({ message: "Failed to update user permissions" });
    }
  });

  // Get all user-agent assignments map - Admin only (efficient for Users table)
  app.get("/api/user-agents-map", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userAgentAssignments = await storage.getAllUserAgentAssignments();
      
      // Convert Map to a plain object for JSON serialization
      const result: Record<string, { count: number; agents: Array<{ id: string; name: string }> }> = {};
      
      userAgentAssignments.forEach((value, userId) => {
        result[userId] = {
          count: value.count,
          agents: value.agents.map(agent => ({ id: agent.id, name: agent.name }))
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching user-agent assignments map:', error);
      res.status(500).json({ message: "Failed to fetch user-agent assignments" });
    }
  });

  // User-Agent assignment routes - Admin only
  app.get("/api/users/:userId/agents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get assigned agents for the user
      const agents = await storage.getUserAgents(userId);
      res.json(agents);
    } catch (error) {
      console.error('Error fetching user agents:', error);
      res.status(500).json({ message: "Failed to fetch user agents" });
    }
  });

  app.put("/api/users/:userId/agents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Validate input with Zod schema
      const agentAssignmentSchema = z.object({
        agentIds: z.array(z.string().uuid("Each agent ID must be a valid UUID"))
      });
      
      const validationResult = agentAssignmentSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validationResult.error.flatten()
        });
      }
      
      const { agentIds } = validationResult.data;
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admins don't need assignments - they see everything
      if (user.role === 'admin') {
        return res.status(400).json({ message: "Cannot modify assignments for admin users" });
      }
      
      // Update the assignments
      await storage.assignAgents(userId, agentIds);
      
      // Return the updated list of assigned agents
      const updatedAgents = await storage.getUserAgents(userId);
      res.json(updatedAgents);
    } catch (error) {
      console.error('Error updating user agents:', error);
      res.status(500).json({ message: "Failed to update user agents" });
    }
  });

  // Get all agents (without user filtering) - Admin only
  app.get("/api/all-agents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      // For admins to see all agents when assigning
      const agents = await storage.getAllAgents(req.user!.id);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all agents" });
    }
  });

  // Agent routes - Protected with data isolation
  app.get("/api/agents", requireAuth, async (req: Request, res: Response) => {
    try {
      const agents = await storage.getAllAgents(req.user!.id);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const agent = await storage.getAgent(req.user!.id, req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found or access denied" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.post("/api/agents", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const agentData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ message: "Invalid agent data" });
    }
  });

  // Call routes - Protected with data isolation
  app.get("/api/calls", requireAuth, async (req: Request, res: Response) => {
    try {
      const calls = await storage.getAllCalls(req.user!.id);
      
      // Get agents to include in response (only the ones user has access to)
      const agents = await storage.getAllAgents(req.user!.id);
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

  // Advanced Search API
  app.get("/api/calls/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const params = {
        q: req.query.q as string | undefined,
        agentId: req.query.agentId as string | undefined,
        sentiment: req.query.sentiment ? (Array.isArray(req.query.sentiment) ? req.query.sentiment : [req.query.sentiment]) as string[] : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        durationMin: req.query.durationMin ? parseInt(req.query.durationMin as string) : undefined,
        durationMax: req.query.durationMax ? parseInt(req.query.durationMax as string) : undefined,
        hasRecording: req.query.hasRecording ? req.query.hasRecording === 'true' : undefined,
        sortBy: req.query.sortBy as 'date' | 'duration' | 'sentiment' | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };
      
      const result = await storage.searchCalls(req.user!.id, params);
      
      // Get agents to include in response
      const agents = await storage.getAllAgents(req.user!.id);
      const agentsMap = new Map(agents.map(agent => [agent.id, agent]));
      
      // Add agent details to each call
      const callsWithAgents = result.calls.map(call => ({
        ...call,
        agent: agentsMap.get(call.agentId),
      }));
      
      res.json({
        ...result,
        calls: callsWithAgents
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: "Failed to search calls" });
    }
  });

  // Search suggestions
  app.get("/api/calls/suggestions", requireAuth, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || '';
      const suggestions = await storage.getSearchSuggestions(req.user!.id, query);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });

  // Analytics data
  app.get("/api/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const params = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : new Date(),
        compareFrom: req.query.compareFrom ? new Date(req.query.compareFrom as string) : undefined,
        compareTo: req.query.compareTo ? new Date(req.query.compareTo as string) : undefined,
        groupBy: req.query.groupBy as 'hour' | 'day' | 'week' | 'month' | undefined,
      };
      
      const analyticsData = await storage.getAnalyticsData(req.user!.id, params);
      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  app.get("/api/calls/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const call = await storage.getCall(req.user!.id, req.params.id);
      if (!call) {
        return res.status(404).json({ message: "Call not found or access denied" });
      }

      // Get agent information (with user's access check)
      const agent = await storage.getAgent(req.user!.id, call.agentId);
      
      // Get performance metrics (filtered for user's access)
      const metrics = await storage.getPerformanceMetricsByCall(req.user!.id, call.id);
      
      res.json({
        ...call,
        agent,
        metrics,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  app.post("/api/calls", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const callData = insertCallSchema.parse(req.body);
      const call = await storage.createCall(callData);
      res.status(201).json(call);
    } catch (error) {
      res.status(400).json({ message: "Invalid call data" });
    }
  });

  // LiveKit room routes - Protected with data isolation
  app.get("/api/livekit/rooms", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!livekit.isLiveKitConfigured()) {
        return res.status(503).json({ 
          message: "LiveKit is not configured",
          status: livekit.getLiveKitStatus()
        });
      }
      
      const rooms = await livekit.getActiveRooms();
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching LiveKit rooms:', error);
      res.status(500).json({ message: "Failed to fetch LiveKit rooms" });
    }
  });
  
  // LiveKit metrics route
  app.get("/api/livekit/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!livekit.isLiveKitConfigured()) {
        return res.status(503).json({ 
          message: "LiveKit is not configured",
          status: livekit.getLiveKitStatus()
        });
      }
      
      const metrics = await livekit.getLiveKitMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching LiveKit metrics:', error);
      res.status(500).json({ message: "Failed to fetch LiveKit metrics" });
    }
  });
  
  // Get participants in a specific room
  app.get("/api/livekit/rooms/:roomName/participants", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!livekit.isLiveKitConfigured()) {
        return res.status(503).json({ 
          message: "LiveKit is not configured",
          status: livekit.getLiveKitStatus()
        });
      }
      
      const participants = await livekit.getRoomParticipants(req.params.roomName);
      res.json(participants);
    } catch (error) {
      console.error('Error fetching room participants:', error);
      res.status(500).json({ message: "Failed to fetch room participants" });
    }
  });
  
  // Create access token for a participant
  app.post("/api/livekit/token", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!livekit.isLiveKitConfigured()) {
        return res.status(503).json({ 
          message: "LiveKit is not configured",
          status: livekit.getLiveKitStatus()
        });
      }
      
      const { roomName, participantIdentity, participantName } = req.body;
      
      if (!roomName || !participantIdentity) {
        return res.status(400).json({ message: "roomName and participantIdentity are required" });
      }
      
      const token = await livekit.createAccessToken(roomName, participantIdentity, participantName);
      res.json({ token, url: process.env.LIVEKIT_URL });
    } catch (error) {
      console.error('Error creating LiveKit token:', error);
      res.status(500).json({ message: "Failed to create LiveKit token" });
    }
  });
  
  // Create a new room (Admin only)
  app.post("/api/livekit/rooms", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!livekit.isLiveKitConfigured()) {
        return res.status(503).json({ 
          message: "LiveKit is not configured",
          status: livekit.getLiveKitStatus()
        });
      }
      
      const { roomName, emptyTimeout, maxParticipants, metadata } = req.body;
      
      if (!roomName) {
        return res.status(400).json({ message: "roomName is required" });
      }
      
      const room = await livekit.createRoom(roomName, emptyTimeout, maxParticipants, metadata);
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating LiveKit room:', error);
      res.status(500).json({ message: "Failed to create LiveKit room" });
    }
  });
  
  // Delete a room (Admin only)
  app.delete("/api/livekit/rooms/:roomName", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      if (!livekit.isLiveKitConfigured()) {
        return res.status(503).json({ 
          message: "LiveKit is not configured",
          status: livekit.getLiveKitStatus()
        });
      }
      
      await livekit.deleteRoom(req.params.roomName);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting LiveKit room:', error);
      res.status(500).json({ message: "Failed to delete LiveKit room" });
    }
  });
  
  // LiveKit configuration status
  app.get("/api/livekit/status", requireAuth, async (req: Request, res: Response) => {
    const status = livekit.getLiveKitStatus();
    res.json(status);
  });

  // Performance metrics routes - Protected with data isolation
  app.get("/api/metrics/agent/:agentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getPerformanceMetricsByAgent(req.user!.id, req.params.agentId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Integration Management Routes - Admin only
  app.get("/api/integrations", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      
      // Don't send the actual encrypted keys to the frontend
      const integrations = apiKeys.map(key => ({
        service: key.service,
        isActive: key.isActive,
        lastUsed: key.lastUsed,
        updatedAt: key.updatedAt,
        hasKey: !!key.encryptedKey,
      }));
      
      // Add services that don't have keys yet
      const services = ['elevenlabs', 'livekit', 'openai'];
      const existingServices = integrations.map(i => i.service);
      
      for (const service of services) {
        if (!existingServices.includes(service as any)) {
          integrations.push({
            service: service as 'elevenlabs' | 'livekit' | 'openai',
            isActive: false,
            lastUsed: null as Date | null,
            updatedAt: null as Date | null,
            hasKey: false,
          });
        }
      }
      
      res.json(integrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.put("/api/integrations/:service", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Validate service name
      const validServices = ['elevenlabs', 'livekit', 'openai'];
      if (!validServices.includes(service)) {
        return res.status(400).json({ message: "Invalid service" });
      }
      
      // Encrypt the API key before storing
      const encryptedKey = encrypt(apiKey);
      
      // Update or create the API key
      const updated = await storage.updateApiKey(service, encryptedKey);
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update API key" });
      }
      
      // Test the connection if it's ElevenLabs
      if (service === 'elevenlabs') {
        const testResult = await elevenLabsIntegration.testConnection();
        if (!testResult) {
          return res.status(400).json({ message: "Invalid API key - connection test failed" });
        }
      }
      
      res.json({ 
        message: "API key updated successfully",
        service,
        isActive: true,
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.delete("/api/integrations/:service", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      
      const deleted = await storage.deleteApiKey(service);
      
      if (!deleted) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Agent Import Routes
  app.get("/api/agents/search/:agentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { platform } = req.query;
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // Initialize and fetch agent from ElevenLabs
      const agent = await elevenLabsIntegration.fetchAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found in ElevenLabs" });
      }
      
      const parsedAgent = elevenLabsIntegration.parseAgentForImport(agent);
      res.json(parsedAgent);
    } catch (error: any) {
      console.error('Error searching for agent:', error);
      res.status(500).json({ 
        message: error.message || "Failed to search for agent" 
      });
    }
  });

  app.post("/api/agents/import", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId, platform } = req.body;
      
      if (!agentId || !platform) {
        return res.status(400).json({ message: "Agent ID and platform are required" });
      }
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // Fetch agent from ElevenLabs
      const externalAgent = await elevenLabsIntegration.fetchAgentById(agentId);
      
      if (!externalAgent) {
        return res.status(404).json({ message: "Agent not found in ElevenLabs" });
      }
      
      // Parse agent data
      const agentData = elevenLabsIntegration.parseAgentForImport(externalAgent);
      
      // Check if agent already exists
      const existingAgents = await storage.getAllAgents(req.user!.id);
      const exists = existingAgents.some(a => a.externalId === agentId && a.platform === 'elevenlabs');
      
      if (exists) {
        return res.status(400).json({ message: "Agent already imported" });
      }
      
      // Create the agent
      const newAgent = await storage.createAgent({
        name: agentData.name,
        platform: agentData.platform,
        externalId: agentData.externalId,
        description: agentData.description,
        metadata: agentData.metadata,
        isActive: true,
      });
      
      // Assign the agent to the current user
      await storage.assignAgents(req.user!.id, [newAgent.id]);
      
      res.status(201).json(newAgent);
    } catch (error: any) {
      console.error('Error importing agent:', error);
      res.status(500).json({ 
        message: error.message || "Failed to import agent" 
      });
    }
  });

  app.get("/api/agents/list-external", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform } = req.query;
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // List all agents from ElevenLabs
      const agents = await elevenLabsIntegration.listAgents(20);
      
      const parsedAgents = agents.map(agent => elevenLabsIntegration.parseAgentForImport(agent));
      res.json(parsedAgents);
    } catch (error: any) {
      console.error('Error listing external agents:', error);
      res.status(500).json({ 
        message: error.message || "Failed to list external agents" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
