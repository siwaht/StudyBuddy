import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAgentSchema, insertCallSchema, type Account } from "@shared/schema";
import { hashPassword, validatePassword, requireAuth, requireAdmin } from "./auth";
import { z } from "zod";
import * as livekit from "./livekit";
import { elevenLabsIntegration } from "./integrations/elevenlabs";
import { elevenlabsService } from "./services/elevenlabs";
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
      
      // Set cache headers for dashboard stats (cache for 1 minute)
      res.set({
        'Cache-Control': 'private, max-age=60',
        'Vary': 'Authorization'
      });
      
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
      // Extract agent IDs and permissions from request body
      const { agentIds, permissions, ...userDataRaw } = req.body;
      
      // Parse user data with the schema
      const userData = insertUserSchema.parse(userDataRaw);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash the password before storing
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with hashed password and permissions
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        permissions: permissions || {}
      });
      
      // If user is not an admin and agent IDs were provided, assign them
      if (user.role !== 'admin' && agentIds && Array.isArray(agentIds) && agentIds.length > 0) {
        await storage.assignAgents(user.id, agentIds);
      }
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('User creation error:', error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      
      // If password is being updated, hash it first
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }
      
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

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent deleting the last admin
      if (user.role === 'admin') {
        const allUsers = await storage.getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Cannot delete the last admin user" });
        }
      }
      
      // Delete the user
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: "Failed to delete user" });
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
      
      // Set cache headers for agents list (cache for 5 minutes)
      res.set({
        'Cache-Control': 'private, max-age=300',
        'Vary': 'Authorization'
      });
      
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

  app.delete("/api/agents/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Check if agent exists
      const agent = await storage.getAgent(req.user!.id, id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found or access denied" });
      }
      
      // Delete the agent
      const success = await storage.deleteAgent(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete agent" });
      }
      
      res.json({ message: "Agent deleted successfully" });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ message: "Failed to delete agent" });
    }
  });

  // Call routes - Protected with data isolation
  app.get("/api/calls", requireAuth, async (req: Request, res: Response) => {
    try {
      const calls = await storage.getAllCalls(req.user!.id);
      
      // Get agents to include in response (only the ones user has access to)
      const agents = await storage.getAllAgents(req.user!.id);
      const agentsMap = new Map(agents.map(agent => [agent.id, agent]));
      
      // Add recording URLs for ElevenLabs conversations
      const callsWithRecordings = await Promise.all(calls.map(async (call) => {
        // For ElevenLabs conversations, generate recording URL if not already present
        if (call.id.startsWith('EL-') && !call.recordingUrl) {
          const conversationId = call.id.replace('EL-', '');
          // Generate a direct streaming URL for the recording
          const recordingUrl = elevenlabsService.isConfigured() 
            ? await elevenlabsService.getConversationRecordingUrl(conversationId)
            : null;
          return {
            ...call,
            recordingUrl: recordingUrl || call.recordingUrl
          };
        }
        return call;
      }));
      
      const callsWithAgents = callsWithRecordings.map(call => ({
        ...call,
        agent: agentsMap.get(call.agentId),
      }));
      
      // Set cache headers for calls list (cache for 30 seconds - since calls update frequently)
      res.set({
        'Cache-Control': 'private, max-age=30',
        'Vary': 'Authorization'
      });
      
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
      
      // Set cache headers for analytics data (cache for 2 minutes)
      res.set({
        'Cache-Control': 'private, max-age=120',
        'Vary': 'Authorization'
      });
      
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
      
      // Add recording URL for ElevenLabs conversations if not present
      let recordingUrl = call.recordingUrl;
      if (call.id.startsWith('EL-') && !recordingUrl && elevenlabsService.isConfigured()) {
        const conversationId = call.id.replace('EL-', '');
        // Check if audio is actually available before providing the URL
        const hasAudio = await elevenlabsService.hasConversationAudio(conversationId);
        if (hasAudio) {
          // Use the full call ID as the recording endpoint parameter
          recordingUrl = `/api/calls/${call.id}/recording`;
        } else {
          console.log(`No audio available for conversation ${conversationId}`);
          recordingUrl = null;
        }
      }
      
      res.json({
        ...call,
        recordingUrl,
        agent,
        metrics,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  // Proxy endpoint for ElevenLabs call recordings
  app.get("/api/calls/:id/recording", requireAuth, async (req: Request, res: Response) => {
    try {
      // Verify user has access to this call
      const call = await storage.getCall(req.user!.id, req.params.id);
      if (!call) {
        return res.status(404).json({ message: "Call not found or access denied" });
      }

      // Only handle ElevenLabs recordings
      if (!call.id.startsWith('EL-')) {
        return res.status(404).json({ message: "Recording not available for non-ElevenLabs calls" });
      }

      const conversationId = call.id.replace('EL-', '');
      
      // First check if audio is available
      const hasAudio = await elevenlabsService.hasConversationAudio(conversationId);
      if (!hasAudio) {
        console.log(`No audio available for conversation ${conversationId}`);
        return res.status(404).json({ message: "Audio recording not available for this conversation. The conversation may not have been recorded or audio may still be processing." });
      }
      
      // Fetch the audio from ElevenLabs
      const audioBuffer = await elevenlabsService.getConversationAudio(conversationId);
      
      if (!audioBuffer) {
        return res.status(404).json({ message: "Recording not found or not yet available. Please try again later." });
      }

      // Set appropriate headers for audio streaming
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error('Error fetching recording:', error);
      res.status(500).json({ message: "Failed to fetch recording" });
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

  // Account Management Routes - Admin only
  app.get("/api/accounts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const accounts = await storage.getAllAccounts();
      
      // Don't send the actual encrypted keys to the frontend
      const accountsData = accounts.map(account => ({
        id: account.id,
        name: account.name,
        service: account.service,
        isActive: account.isActive,
        lastSynced: account.lastSynced,
        metadata: account.metadata,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        hasKey: !!account.encryptedApiKey,
      }));
      
      res.json(accountsData);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, service, apiKey } = req.body;
      
      if (!name || !service || !apiKey) {
        return res.status(400).json({ message: "Name, service, and API key are required" });
      }
      
      // Validate service name
      const validServices = ['elevenlabs', 'livekit'];
      if (!validServices.includes(service)) {
        return res.status(400).json({ message: "Invalid service" });
      }
      
      // Validate that the user isn't entering an agent ID instead of an API key
      if (service === 'elevenlabs' && apiKey.startsWith('agent_')) {
        return res.status(400).json({ 
          message: "Invalid API key format",
          error: "You entered an Agent ID instead of an API key. ElevenLabs API keys start with 'sk_' or 'xi-'. Find your API key at https://elevenlabs.io/app/settings/api-keys"
        });
      }
      
      // Encrypt the API key before storing
      const encryptedKey = encrypt(apiKey);
      
      // Create the account
      const account = await storage.createAccount({
        name,
        service: service as 'elevenlabs' | 'livekit',
        encryptedApiKey: encryptedKey,
        isActive: true,
        metadata: null,
        lastSynced: null,
      });
      
      // Test the connection based on service
      if (service === 'elevenlabs') {
        const testResult = await elevenLabsIntegration.testConnection(account.id);
        if (!testResult) {
          // Delete the account if connection test fails
          await storage.deleteAccount(account.id);
          return res.status(400).json({ 
            message: "Invalid ElevenLabs API key. Please check that you've copied the entire API key from your ElevenLabs profile settings.",
            hint: "You can find your API key at https://elevenlabs.io/app/settings/api-keys" 
          });
        }
      } else if (service === 'livekit') {
        // For LiveKit, validate that the key contains both API key and secret
        if (!apiKey.includes(':')) {
          await storage.deleteAccount(account.id);
          return res.status(400).json({ 
            message: "Invalid LiveKit credentials format. Please enter in format: API_KEY:API_SECRET",
            hint: "Combine your API key and secret with a colon between them" 
          });
        }
      }
      
      res.status(201).json({ 
        message: "Account created successfully",
        account: {
          id: account.id,
          name: account.name,
          service: account.service,
          isActive: account.isActive,
        }
      });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, apiKey, isActive } = req.body;
      
      const updates: Partial<Account> = {};
      
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.isActive = isActive;
      if (apiKey) {
        updates.encryptedApiKey = encrypt(apiKey);
      }
      
      const updated = await storage.updateAccount(id, updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json({ 
        message: "Account updated successfully",
        account: {
          id: updated.id,
          name: updated.name,
          service: updated.service,
          isActive: updated.isActive,
        }
      });
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteAccount(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/accounts/by-service/:service", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { service } = req.params;
      
      if (service !== 'elevenlabs' && service !== 'livekit') {
        return res.status(400).json({ message: "Invalid service" });
      }
      
      const accounts = await storage.getAccountsByService(service as 'elevenlabs' | 'livekit');
      
      const accountsData = accounts.map(account => ({
        id: account.id,
        name: account.name,
        service: account.service,
        isActive: account.isActive,
        lastSynced: account.lastSynced,
        metadata: account.metadata,
        hasKey: !!account.encryptedApiKey,
      }));
      
      res.json(accountsData);
    } catch (error) {
      console.error('Error fetching accounts by service:', error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // Comprehensive agent sync endpoint
  app.post("/api/agents/:agentId/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { accountId, syncType = 'full' } = req.body;
      const userId = req.user!.id;
      
      // Verify the agent exists and user has access
      const agent = await storage.getAgent(userId, agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      if (agent.platform !== 'elevenlabs') {
        return res.status(400).json({ 
          message: "Sync is currently only available for ElevenLabs agents" 
        });
      }
      
      // Create sync history record
      const syncRecord = await storage.createSyncHistory({
        agentId,
        syncType: syncType as 'full' | 'incremental',
        itemsSynced: 0,
        status: 'in_progress',
        errorMessage: null,
        completedAt: null,
      });
      
      try {
        // Sync agent configuration first
        let agentUpdated = false;
        try {
          const agentDetails = await elevenLabsIntegration.fetchAgentById(
            agent.externalId!,
            accountId || agent.accountId || undefined
          );
          
          if (agentDetails) {
            // Update agent metadata with latest from ElevenLabs
            const currentMetadata = (agent.metadata || {}) as Record<string, any>;
            await storage.updateAgent(agentId, {
              name: agentDetails.name || agent.name,
              description: agentDetails.description || agent.description,
              metadata: {
                ...currentMetadata,
                voice: agentDetails.voice,
                language: agentDetails.language,
                prompt: agentDetails.prompt,
                firstMessage: agentDetails.first_message,
                lastSyncedAt: new Date().toISOString(),
              }
            });
            agentUpdated = true;
          }
        } catch (error) {
          console.error('Failed to fetch agent details:', error);
        }
        
        // Fetch all conversations from ElevenLabs
        let allConversations: any[] = [];
        let conversationsSynced = false;
        
        try {
          let cursor: string | undefined;
          let totalFetched = 0;
          const maxLimit = 500; // Sync more data
          
          // Get the last sync time for incremental sync
          let startTime: number | undefined;
          if (syncType === 'incremental') {
            const lastSync = await storage.getLatestSync(agentId);
            if (lastSync?.completedAt) {
              startTime = lastSync.completedAt.getTime();
            }
          }
          
          // Fetch conversations
          do {
            const result = await elevenLabsIntegration.fetchConversations(
              agent.externalId!,
              accountId || agent.accountId || undefined,
              {
                startTime,
                limit: Math.min(100, maxLimit - totalFetched),
                cursor
              }
            );
            
            allConversations = [...allConversations, ...result.conversations];
            cursor = result.cursor;
            totalFetched += result.conversations.length;
            
          } while (cursor && totalFetched < maxLimit);
          
          conversationsSynced = true;
        } catch (error) {
          console.error('Failed to fetch conversations:', error);
          // Continue with sync even if conversations fail
        }
        
        // Import conversations if we have any
        let importResults = { imported: 0, skipped: 0, failed: 0 };
        
        if (allConversations.length > 0) {
          // Fetch detailed conversation data with transcripts and analysis
          const detailedConversations = await Promise.all(
            allConversations.map(async (conv) => {
              try {
                const details = await elevenLabsIntegration.fetchConversationDetails(
                  conv.conversation_id,
                  accountId || agent.accountId || undefined
                );
                return details || conv;
              } catch (error) {
                console.error(`Failed to fetch details for conversation ${conv.conversation_id}:`, error);
                return conv;
              }
            })
          );
          
          // Import conversations into the database
          importResults = await storage.bulkImportConversations(
            agentId,
            detailedConversations
          );
        }
        
        // Update sync history record
        await storage.updateSyncHistory(syncRecord.id, {
          status: 'completed',
          itemsSynced: importResults.imported + (agentUpdated ? 1 : 0),
          completedAt: new Date(),
        });
        
        // Build response message based on what was synced
        let message = "Sync completed";
        if (agentUpdated && importResults.imported > 0) {
          message = "Agent configuration and conversations synced successfully";
        } else if (agentUpdated) {
          message = "Agent configuration synced successfully";
        } else if (importResults.imported > 0) {
          message = "Conversations synced successfully";
        } else {
          message = "Sync completed (no new data found)";
        }
        
        res.json({
          message,
          agentUpdated,
          conversations: importResults.imported,
          transcripts: importResults.imported, // Each conversation includes transcript
          analytics: importResults.imported, // Each conversation includes analysis
          errors: conversationsSynced ? [] : ["Conversations API not available"],
          syncRecord: {
            id: syncRecord.id,
            type: syncType,
            itemsSynced: importResults.imported + (agentUpdated ? 1 : 0),
            skipped: importResults.skipped,
            failed: importResults.failed,
          }
        });
      } catch (error: any) {
        // Update sync history with error
        await storage.updateSyncHistory(syncRecord.id, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        });
        throw error;
      }
    } catch (error: any) {
      console.error('Error syncing agent:', error);
      res.status(500).json({ 
        message: "Failed to sync agent",
        error: error.message 
      });
    }
  });
  
  // Import historical conversations from ElevenLabs (legacy endpoint, kept for compatibility)
  app.post("/api/agents/:agentId/import-conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { accountId, startTime, endTime, limit } = req.body;
      
      // Verify the agent exists and belongs to the right platform
      const agent = await storage.getAgent(req.user!.id, agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      if (agent.platform !== 'elevenlabs') {
        return res.status(400).json({ 
          message: "Conversation import is only available for ElevenLabs agents" 
        });
      }
      
      // Fetch conversations from ElevenLabs
      let allConversations: any[] = [];
      let cursor: string | undefined;
      let totalFetched = 0;
      const maxLimit = limit || 100;
      
      do {
        const result = await elevenLabsIntegration.fetchConversations(
          agent.externalId!,
          accountId || agent.accountId || undefined,
          {
            startTime,
            endTime,
            limit: Math.min(100, maxLimit - totalFetched),
            cursor
          }
        );
        
        allConversations = [...allConversations, ...result.conversations];
        cursor = result.cursor;
        totalFetched += result.conversations.length;
        
      } while (cursor && totalFetched < maxLimit);
      
      // Fetch detailed conversation data for each conversation
      const detailedConversations = await Promise.all(
        allConversations.map(async (conv) => {
          try {
            const details = await elevenLabsIntegration.fetchConversationDetails(
              conv.conversation_id,
              accountId || agent.accountId || undefined
            );
            return details || conv;
          } catch (error) {
            console.error(`Failed to fetch details for conversation ${conv.conversation_id}:`, error);
            return conv;
          }
        })
      );
      
      // Import conversations into the database
      const importResults = await storage.bulkImportConversations(
        agentId,
        detailedConversations
      );
      
      res.json({
        message: "Conversations imported successfully",
        stats: {
          fetched: detailedConversations.length,
          imported: importResults.imported,
          skipped: importResults.skipped,
          failed: importResults.failed
        }
      });
    } catch (error: any) {
      console.error('Error importing conversations:', error);
      res.status(500).json({ 
        message: "Failed to import conversations",
        error: error.message 
      });
    }
  });

  // Phone Numbers Routes
  app.get("/api/phone-numbers", requireAuth, async (req: Request, res: Response) => {
    try {
      const phoneNumbers = await storage.getAllPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error('Error fetching phone numbers:', error);
      res.status(500).json({ 
        message: "Failed to fetch phone numbers",
        error: error.message 
      });
    }
  });
  
  app.get("/api/phone-numbers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const phoneNumber = await storage.getPhoneNumber(id);
      
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      res.json(phoneNumber);
    } catch (error: any) {
      console.error('Error fetching phone number:', error);
      res.status(500).json({ 
        message: "Failed to fetch phone number",
        error: error.message 
      });
    }
  });
  
  app.post("/api/phone-numbers", requireAuth, async (req: Request, res: Response) => {
    try {
      const { number, provider, agentId, configuration, isActive } = req.body;
      
      // Validate provider
      if (provider !== 'twilio' && provider !== 'sip') {
        return res.status(400).json({ message: "Invalid provider. Must be 'twilio' or 'sip'" });
      }
      
      // If agentId is provided, verify it exists
      if (agentId) {
        const agent = await storage.getAgent(req.user!.id, agentId);
        if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
        }
      }
      
      // Create the phone number
      const phoneNumber = await storage.createPhoneNumber({
        number,
        provider,
        agentId: agentId || null,
        accountId: null, // Could be linked to an account in the future
        configuration: configuration || {},
        isActive: isActive !== undefined ? isActive : true,
      });
      
      res.json({
        message: "Phone number added successfully",
        phoneNumber,
      });
    } catch (error: any) {
      console.error('Error creating phone number:', error);
      res.status(500).json({ 
        message: "Failed to create phone number",
        error: error.message 
      });
    }
  });
  
  app.patch("/api/phone-numbers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get existing phone number
      const existingNumber = await storage.getPhoneNumber(id);
      if (!existingNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      // If agentId is being updated, verify it exists
      if (updates.agentId !== undefined && updates.agentId !== null) {
        const agent = await storage.getAgent(req.user!.id, updates.agentId);
        if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
        }
      }
      
      // Update the phone number
      const updatedNumber = await storage.updatePhoneNumber(id, updates);
      
      res.json({
        message: "Phone number updated successfully",
        phoneNumber: updatedNumber,
      });
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      res.status(500).json({ 
        message: "Failed to update phone number",
        error: error.message 
      });
    }
  });
  
  app.delete("/api/phone-numbers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify the phone number exists
      const phoneNumber = await storage.getPhoneNumber(id);
      if (!phoneNumber) {
        return res.status(404).json({ message: "Phone number not found" });
      }
      
      // Delete the phone number
      const deleted = await storage.deletePhoneNumber(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete phone number" });
      }
      
      res.json({
        message: "Phone number deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting phone number:', error);
      res.status(500).json({ 
        message: "Failed to delete phone number",
        error: error.message 
      });
    }
  });

  // ElevenLabs API Routes
  app.get("/api/elevenlabs/signed-url/:agentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      
      if (!elevenlabsService.isConfigured()) {
        return res.status(400).json({ 
          message: "ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY environment variable." 
        });
      }
      
      const signedUrl = await elevenlabsService.getSignedUrl(agentId);
      
      if (!signedUrl) {
        return res.status(500).json({ message: "Failed to generate signed URL" });
      }
      
      res.json({ signedUrl });
    } catch (error: any) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({ 
        message: "Failed to generate signed URL",
        error: error.message 
      });
    }
  });
  
  app.get("/api/elevenlabs/agents", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!elevenlabsService.isConfigured()) {
        return res.json([]); // Return empty array if not configured
      }
      
      const agents = await elevenlabsService.listAgents();
      res.json(agents);
    } catch (error: any) {
      console.error('Error fetching ElevenLabs agents:', error);
      res.status(500).json({ 
        message: "Failed to fetch agents",
        error: error.message 
      });
    }
  });
  
  app.get("/api/elevenlabs/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId, limit } = req.query;
      
      if (!elevenlabsService.isConfigured()) {
        return res.json([]);
      }
      
      const conversations = await elevenlabsService.listConversations(
        agentId as string,
        limit ? parseInt(limit as string) : 100
      );
      
      res.json(conversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ 
        message: "Failed to fetch conversations",
        error: error.message 
      });
    }
  });
  
  app.post("/api/elevenlabs/outbound-call", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId, toNumber, fromNumber, phoneNumberId, provider } = req.body;
      
      if (!elevenlabsService.isConfigured()) {
        return res.status(400).json({ 
          message: "ElevenLabs API key not configured" 
        });
      }
      
      let result;
      
      if (provider === 'sip' && phoneNumberId) {
        // Use SIP trunk for the call
        result = await elevenlabsService.initiateOutboundCallSIP({
          agentId,
          agentPhoneNumberId: phoneNumberId,
          toNumber,
        });
      } else {
        // Use Twilio for the call
        result = await elevenlabsService.initiateOutboundCallTwilio({
          agentId,
          toNumber,
          fromNumber,
        });
      }
      
      res.json({
        message: "Call initiated successfully",
        ...result,
      });
    } catch (error: any) {
      console.error('Error initiating outbound call:', error);
      res.status(500).json({ 
        message: "Failed to initiate call",
        error: error.message 
      });
    }
  });
  
  app.post("/api/elevenlabs/register-phone", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId, phoneNumber, twilioAccountSid, twilioAuthToken } = req.body;
      
      if (!elevenlabsService.isConfigured()) {
        return res.status(400).json({ 
          message: "ElevenLabs API key not configured" 
        });
      }
      
      const result = await elevenlabsService.registerPhoneNumber({
        agentId,
        phoneNumberId: phoneNumber,
        twilioAccountSid,
        twilioAuthToken,
      });
      
      res.json({
        message: "Phone number registered with ElevenLabs",
        ...result,
      });
    } catch (error: any) {
      console.error('Error registering phone number:', error);
      res.status(500).json({ 
        message: "Failed to register phone number",
        error: error.message 
      });
    }
  });
  
  app.get("/api/elevenlabs/usage", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!elevenlabsService.isConfigured()) {
        return res.json({ 
          usage: 0,
          limit: 0,
          remaining: 0 
        });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const usage = await elevenlabsService.getUsageAnalytics(startDate, endDate);
      res.json(usage || { usage: 0, limit: 0, remaining: 0 });
    } catch (error: any) {
      console.error('Error fetching usage:', error);
      res.status(500).json({ 
        message: "Failed to fetch usage",
        error: error.message 
      });
    }
  });

  // Playground Routes
  app.post("/api/playground/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.body;
      const userId = req.user!.id;
      
      // Verify the agent exists and user has access
      const agent = await storage.getAgent(userId, agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      if (agent.platform !== 'elevenlabs') {
        return res.status(400).json({ 
          message: "Playground is currently only available for ElevenLabs agents" 
        });
      }
      
      // Check if ElevenLabs API is configured
      if (!elevenlabsService.isConfigured()) {
        return res.status(400).json({ 
          message: "ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your environment variables." 
        });
      }
      
      // Create playground session record
      const session = await storage.createPlaygroundSession({
        agentId,
        userId,
        sessionId: agent.externalId,
        duration: null,
        transcript: null,
        metadata: {
          agentName: agent.name,
          startedAt: new Date().toISOString(),
        },
      });
      
      // Note: Direct WebSocket connection requires proper authentication
      // This would need to be implemented with:
      // 1. Signed URLs for private agents (using ElevenLabs API)
      // 2. Or proper WebSocket authentication headers
      // For now, direct users to test on the ElevenLabs platform
      
      res.json({
        sessionId: session.id,
        agentId: agent.externalId,
        message: "Session created. Please test your agent on the ElevenLabs platform directly.",
        note: "Direct WebSocket connection requires additional authentication implementation."
      });
    } catch (error: any) {
      console.error('Error starting playground session:', error);
      res.status(500).json({ 
        message: "Failed to start playground session",
        error: error.message 
      });
    }
  });
  
  app.delete("/api/playground/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;
      
      // Get the session to verify ownership
      const session = await storage.getPlaygroundSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to end this session" });
      }
      
      // Calculate duration if not already set
      const sessionMetadata = (session.metadata || {}) as Record<string, any>;
      const startedAt = sessionMetadata.startedAt ? new Date(sessionMetadata.startedAt) : session.createdAt;
      const duration = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      
      // Update session with final data
      await storage.updatePlaygroundSession(sessionId, {
        duration,
        metadata: {
          ...sessionMetadata,
          endedAt: new Date().toISOString(),
        },
      });
      
      res.json({
        message: "Playground session ended",
        duration,
      });
    } catch (error: any) {
      console.error('Error ending playground session:', error);
      res.status(500).json({ 
        message: "Failed to end playground session",
        error: error.message 
      });
    }
  });
  
  app.get("/api/playground/sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const sessions = await storage.getPlaygroundSessionsByUser(userId);
      
      res.json(sessions);
    } catch (error: any) {
      console.error('Error fetching playground sessions:', error);
      res.status(500).json({ 
        message: "Failed to fetch playground sessions",
        error: error.message 
      });
    }
  });

  // Agent Import Routes
  app.get("/api/agents/search/:agentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { platform, accountId } = req.query;
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // Check if user entered an API key instead of an agent ID
      if (agentId.startsWith('sk_') || agentId.startsWith('xi-')) {
        return res.status(400).json({ 
          message: "Invalid Agent ID format",
          error: "You entered an API key instead of an Agent ID. Agent IDs start with 'agent_'. Please find your Agent ID in the ElevenLabs dashboard under Conversational AI → Agents."
        });
      }
      
      // Verify account if provided
      if (accountId && typeof accountId === 'string') {
        const account = await storage.getAccount(accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        if (!account.isActive) {
          return res.status(400).json({ message: "Account is not active" });
        }
        if (account.service !== platform) {
          return res.status(400).json({ message: "Account service does not match platform" });
        }
        // TODO: Use the account's API key for the search once multi-account API key support is added
      }
      
      // Initialize and fetch agent from ElevenLabs
      const agent = await elevenLabsIntegration.fetchAgentById(agentId, accountId as string);
      
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
      const { agentId, platform, accountId } = req.body;
      
      if (!agentId || !platform) {
        return res.status(400).json({ message: "Agent ID and platform are required" });
      }
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // Verify account exists if provided
      if (accountId) {
        const account = await storage.getAccount(accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        if (account.service !== platform) {
          return res.status(400).json({ message: "Account service does not match platform" });
        }
      }
      
      // Fetch agent from ElevenLabs
      const externalAgent = await elevenLabsIntegration.fetchAgentById(agentId, accountId);
      
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
        accountId: accountId || null,
        externalId: agentData.externalId,
        description: agentData.description,
        metadata: agentData.metadata,
        isActive: true,
      });
      
      // Add the agent to the current user's assignments
      await storage.addAgentsToUser(req.user!.id, [newAgent.id]);
      
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
      const { platform, accountId } = req.query;
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // Verify account exists if provided
      if (accountId) {
        const account = await storage.getAccount(accountId as string);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        if (account.service !== platform) {
          return res.status(400).json({ message: "Account service does not match platform" });
        }
      }
      
      // List all agents from ElevenLabs
      const agents = await elevenLabsIntegration.listAgents(100, accountId as string);
      
      // Get existing agents to filter out already imported ones
      const existingAgents = await storage.getAllAgents(req.user!.id);
      const existingExternalIds = existingAgents
        .filter(a => a.platform === 'elevenlabs')
        .map(a => a.externalId);
      
      const parsedAgents = agents
        .filter(agent => !existingExternalIds.includes(agent.agent_id))
        .map(agent => elevenLabsIntegration.parseAgentForImport(agent));
      
      res.json(parsedAgents);
    } catch (error: any) {
      console.error('Error listing external agents:', error);
      res.status(500).json({ 
        message: error.message || "Failed to list external agents" 
      });
    }
  });
  
  // Import all agents endpoint
  app.post("/api/agents/import-all", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform, accountId } = req.body;
      
      if (!platform) {
        return res.status(400).json({ message: "Platform is required" });
      }
      
      if (platform !== 'elevenlabs') {
        return res.status(400).json({ message: "Only ElevenLabs platform is currently supported" });
      }
      
      // Verify account exists if provided
      if (accountId) {
        const account = await storage.getAccount(accountId);
        if (!account) {
          return res.status(404).json({ message: "Account not found" });
        }
        if (account.service !== platform) {
          return res.status(400).json({ message: "Account service does not match platform" });
        }
      }
      
      // List all agents from ElevenLabs
      const externalAgents = await elevenLabsIntegration.listAgents(100, accountId);
      
      // Get existing agents to avoid duplicates
      const existingAgents = await storage.getAllAgents(req.user!.id);
      const existingExternalIds = existingAgents
        .filter(a => a.platform === 'elevenlabs')
        .map(a => a.externalId);
      
      // Filter out already imported agents
      const agentsToImport = externalAgents.filter(
        agent => !existingExternalIds.includes(agent.agent_id)
      );
      
      if (agentsToImport.length === 0) {
        return res.status(200).json({ 
          message: "No new agents to import",
          imported: 0
        });
      }
      
      const importedAgents = [];
      const failedImports = [];
      
      for (const externalAgent of agentsToImport) {
        try {
          // Parse agent data
          const agentData = elevenLabsIntegration.parseAgentForImport(externalAgent);
          
          // Create the agent
          const newAgent = await storage.createAgent({
            name: agentData.name,
            platform: agentData.platform,
            accountId: accountId || null,
            externalId: agentData.externalId,
            description: agentData.description,
            metadata: agentData.metadata,
            isActive: true,
          });
          
          importedAgents.push(newAgent);
        } catch (error: any) {
          console.error(`Failed to import agent ${externalAgent.agent_id}:`, error);
          failedImports.push({
            agentId: externalAgent.agent_id,
            name: externalAgent.name,
            error: error.message
          });
        }
      }
      
      // Add all imported agents to the user's assignments
      if (importedAgents.length > 0) {
        await storage.addAgentsToUser(req.user!.id, importedAgents.map(a => a.id));
      }
      
      res.status(201).json({
        message: `Successfully imported ${importedAgents.length} agents`,
        imported: importedAgents.length,
        failed: failedImports.length,
        agents: importedAgents,
        errors: failedImports
      });
    } catch (error: any) {
      console.error('Error importing all agents:', error);
      res.status(500).json({ 
        message: error.message || "Failed to import agents" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
