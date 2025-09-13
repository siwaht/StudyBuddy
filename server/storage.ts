import { 
  type User, type InsertUser,
  type Agent, type InsertAgent,
  type Call, type InsertCall,
  type PerformanceMetric, type InsertPerformanceMetric,
  type LiveKitRoom, type InsertLiveKitRoom,
  type UserAgent, type InsertUserAgent
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Authentication
  validatePassword(userId: string, password: string): Promise<boolean>;
  updatePassword(userId: string, hashedPassword: string): Promise<boolean>;

  // User-Agent Assignments (Multi-tenancy)
  getAssignedAgentIds(userId: string): Promise<string[]>;
  assignAgents(userId: string, agentIds: string[]): Promise<void>;
  removeAgentAssignment(userId: string, agentId: string): Promise<void>;
  getUserAgents(userId: string): Promise<Agent[]>;
  getAllUserAgentAssignments(): Promise<Map<string, { count: number; agents: Agent[] }>>;

  // Agents - REQUIRES USER ID FOR DATA ISOLATION
  getAgent(userId: string, agentId: string): Promise<Agent | undefined>;
  getAllAgents(userId: string): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;

  // Calls - REQUIRES USER ID FOR DATA ISOLATION
  getCall(userId: string, callId: string): Promise<Call | undefined>;
  getAllCalls(userId: string): Promise<Call[]>;
  getCallsByAgent(userId: string, agentId: string): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined>;

  // Performance Metrics - REQUIRES USER ID FOR DATA ISOLATION
  getPerformanceMetric(userId: string, metricId: string): Promise<PerformanceMetric | undefined>;
  getPerformanceMetricsByCall(userId: string, callId: string): Promise<PerformanceMetric[]>;
  getPerformanceMetricsByAgent(userId: string, agentId: string): Promise<PerformanceMetric[]>;
  getPerformanceMetrics(userId: string): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;

  // LiveKit Rooms - REQUIRES USER ID FOR DATA ISOLATION
  getLiveKitRoom(userId: string, roomId: string): Promise<LiveKitRoom | undefined>;
  getAllLiveKitRooms(userId: string): Promise<LiveKitRoom[]>;
  createLiveKitRoom(room: InsertLiveKitRoom): Promise<LiveKitRoom>;
  updateLiveKitRoom(id: string, updates: Partial<LiveKitRoom>): Promise<LiveKitRoom | undefined>;

  // Dashboard data - REQUIRES USER ID FOR DATA ISOLATION
  getDashboardStats(userId: string): Promise<{
    totalCalls: number;
    avgHandleTime: string;
    elevenLabsLatencyP95: number;
    activeRooms: number;
    callVolumeData: Array<{ time: string; elevenlabs: number; livekit: number }>;
    recentCalls: Call[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private agents: Map<string, Agent> = new Map();
  private calls: Map<string, Call> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private liveKitRooms: Map<string, LiveKitRoom> = new Map();
  private userAgents: Map<string, UserAgent> = new Map();

  constructor() {
    this.seedDataAsync();
  }

  private async seedDataAsync() {
    await this.seedData();
  }

  private async seedData() {
    // Seed users - 2 admins and 3 regular users with properly hashed passwords
    // Default password for all test users: "password123"
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const users = [
      {
        id: randomUUID(),
        username: "alice.johnson",
        email: "alice@company.com",
        password: hashedPassword,
        role: "admin" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        username: "admin.smith",
        email: "admin.smith@company.com",
        password: hashedPassword,
        role: "admin" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        username: "bob.wilson",
        email: "bob@company.com",
        password: hashedPassword,
        role: "user" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        username: "sarah.connors",
        email: "sarah@company.com",
        password: hashedPassword,
        role: "user" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        username: "john.doe",
        email: "john@company.com",
        password: hashedPassword,
        role: "user" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        createdAt: new Date(),
      },
    ];

    users.forEach(user => this.users.set(user.id, user));

    // Seed agents
    const agents = [
      {
        id: randomUUID(),
        name: "SalesBot",
        platform: "elevenlabs" as const,
        description: "High quality voice agent for sales inquiries",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "SupportRouter",
        platform: "livekit" as const,
        description: "Advanced technical support worker with GPT-4o integration",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "IVR Assistant",
        platform: "elevenlabs" as const,
        description: "Initial call routing and FAQ handling",
        isActive: false,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Customer Service Bot",
        platform: "livekit" as const,
        description: "General customer service inquiries",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    agents.forEach(agent => this.agents.set(agent.id, agent));

    // Create user-agent assignments
    const userList = Array.from(this.users.values());
    const agentList = Array.from(this.agents.values());
    
    // Admins don't need assignments - they see everything
    // Regular users get different agent assignments
    const bobId = userList.find(u => u.username === "bob.wilson")?.id!;
    const sarahId = userList.find(u => u.username === "sarah.connors")?.id!;
    const johnId = userList.find(u => u.username === "john.doe")?.id!;
    
    const salesBotId = agentList.find(a => a.name === "SalesBot")?.id!;
    const supportRouterId = agentList.find(a => a.name === "SupportRouter")?.id!;
    const ivrAssistantId = agentList.find(a => a.name === "IVR Assistant")?.id!;
    const customerServiceId = agentList.find(a => a.name === "Customer Service Bot")?.id!;

    // Bob gets SalesBot and IVR Assistant
    this.userAgents.set(randomUUID(), {
      id: randomUUID(),
      userId: bobId,
      agentId: salesBotId,
      assignedAt: new Date(),
    });
    this.userAgents.set(randomUUID(), {
      id: randomUUID(),
      userId: bobId,
      agentId: ivrAssistantId,
      assignedAt: new Date(),
    });

    // Sarah gets SupportRouter and Customer Service Bot
    this.userAgents.set(randomUUID(), {
      id: randomUUID(),
      userId: sarahId,
      agentId: supportRouterId,
      assignedAt: new Date(),
    });
    this.userAgents.set(randomUUID(), {
      id: randomUUID(),
      userId: sarahId,
      agentId: customerServiceId,
      assignedAt: new Date(),
    });

    // John gets only Customer Service Bot
    this.userAgents.set(randomUUID(), {
      id: randomUUID(),
      userId: johnId,
      agentId: customerServiceId,
      assignedAt: new Date(),
    });

    // Seed LiveKit rooms
    const rooms = [
      {
        id: randomUUID(),
        roomId: "RM_A9B8C7",
        name: "Sales Conference",
        isActive: true,
        participantCount: 3,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        roomId: "RM_D4E5F6",
        name: "Support Room",
        isActive: true,
        participantCount: 2,
        createdAt: new Date(),
      },
    ];

    rooms.forEach(room => this.liveKitRooms.set(room.id, room));

    // Seed calls
    const calls = [
      {
        id: "C-1055",
        agentId: salesBotId,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
        duration: 312, // 5m 12s
        sentiment: "positive" as const,
        outcome: "Sale Closed",
        recordingUrl: "/recordings/C-1055.mp3",
        transcript: [
          { timestamp: "00:01", speaker: "agent", text: "Hello, thank you for calling. How can I help you today?" },
          { timestamp: "00:08", speaker: "user", text: "Hi, I'm interested in your enterprise pricing plans." },
          { timestamp: "00:15", speaker: "agent", text: "I can certainly help with that. Our enterprise plans are customized based on volume." },
        ],
        analysis: {
          summary: "The caller inquired about enterprise pricing. The agent successfully gathered volume requirements and closed the sale.",
          topics: ["Pricing", "Enterprise Features"],
          latencyWaterfall: {
            speechToText: 80,
            agentLogic: 60,
            elevenLabsTTS: 120,
            liveKitTransport: 50,
          }
        },
        metadata: { roomId: "RM_A9B8C7" },
        createdAt: new Date(),
      },
      {
        id: "C-1056",
        agentId: supportRouterId,
        startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000 + 65 * 1000),
        duration: 65, // 1m 05s
        sentiment: "negative" as const,
        outcome: "Escalated to Human",
        recordingUrl: "/recordings/C-1056.mp3",
        transcript: [
          { timestamp: "00:01", speaker: "agent", text: "Hello, I'm here to help with your technical issue." },
          { timestamp: "00:06", speaker: "user", text: "My account is locked and I can't access my data!" },
          { timestamp: "00:12", speaker: "agent", text: "I understand your frustration. Let me escalate this to our security team." },
        ],
        analysis: {
          summary: "Customer frustrated with locked account, escalated to human agent.",
          topics: ["Account Issues", "Security"],
          latencyWaterfall: {
            speechToText: 95,
            agentLogic: 45,
            elevenLabsTTS: 0,
            liveKitTransport: 30,
          }
        },
        metadata: { roomId: "RM_D4E5F6" },
        createdAt: new Date(),
      },
      {
        id: "C-1057",
        agentId: customerServiceId,
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 3 * 60 * 60 * 1000 + 3 * 60 * 1000),
        duration: 180, // 3m
        sentiment: "neutral" as const,
        outcome: "Resolved",
        recordingUrl: "/recordings/C-1057.mp3",
        transcript: [
          { timestamp: "00:01", speaker: "agent", text: "Hello, customer service, how may I assist you?" },
          { timestamp: "00:07", speaker: "user", text: "I need to update my billing information." },
          { timestamp: "00:14", speaker: "agent", text: "I can help you with that. Let me guide you through the process." },
        ],
        analysis: {
          summary: "Customer requested billing information update, successfully completed.",
          topics: ["Billing", "Account Management"],
          latencyWaterfall: {
            speechToText: 70,
            agentLogic: 50,
            elevenLabsTTS: 0,
            liveKitTransport: 40,
          }
        },
        metadata: { roomId: "RM_D4E5F6" },
        createdAt: new Date(),
      },
    ];

    calls.forEach(call => this.calls.set(call.id, call));

    // Seed performance metrics
    calls.forEach(call => {
      const metric = {
        id: randomUUID(),
        agentId: call.agentId,
        callId: call.id,
        speechToTextLatency: call.analysis?.latencyWaterfall?.speechToText || 0,
        elevenLabsLatency: call.analysis?.latencyWaterfall?.elevenLabsTTS || 0,
        liveKitLatency: call.analysis?.latencyWaterfall?.liveKitTransport || 0,
        totalLatency: Object.values(call.analysis?.latencyWaterfall || {}).reduce((a, b) => a + b, 0),
        responseTime: 95,
        audioQuality: "4.6",
        successRate: "0.985",
        timestamp: call.startTime,
      };
      this.performanceMetrics.set(metric.id, metric);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      createdAt: new Date(),
      role: insertUser.role || "user",
      isActive: insertUser.isActive ?? true,
      lastActive: insertUser.lastActive || null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Authentication methods
  async validatePassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    await this.updateUser(userId, { password: hashedPassword });
    return true;
  }

  // User-Agent Assignment methods
  async getAssignedAgentIds(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Admins see all agents
    if (user.role === 'admin') {
      return Array.from(this.agents.keys());
    }
    
    // Regular users see only assigned agents
    return Array.from(this.userAgents.values())
      .filter(ua => ua.userId === userId)
      .map(ua => ua.agentId);
  }

  async assignAgents(userId: string, agentIds: string[]): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    // Validate that all agent IDs exist
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }
    }
    
    // Remove existing assignments for this user
    const existingAssignments = Array.from(this.userAgents.entries())
      .filter(([_, ua]) => ua.userId === userId);
    existingAssignments.forEach(([key, _]) => this.userAgents.delete(key));
    
    // Create new assignments
    agentIds.forEach(agentId => {
      const id = randomUUID();
      this.userAgents.set(id, {
        id,
        userId,
        agentId,
        assignedAt: new Date(),
      });
    });
  }

  async removeAgentAssignment(userId: string, agentId: string): Promise<void> {
    const assignment = Array.from(this.userAgents.entries())
      .find(([_, ua]) => ua.userId === userId && ua.agentId === agentId);
    
    if (assignment) {
      this.userAgents.delete(assignment[0]);
    }
  }

  async getUserAgents(userId: string): Promise<Agent[]> {
    const agentIds = await this.getAssignedAgentIds(userId);
    return Array.from(this.agents.values())
      .filter(agent => agentIds.includes(agent.id));
  }

  async getAllUserAgentAssignments(): Promise<Map<string, { count: number; agents: Agent[] }>> {
    const userAgentMap = new Map<string, { count: number; agents: Agent[] }>();
    
    // Get all users
    const users = Array.from(this.users.values());
    const allAgents = Array.from(this.agents.values());
    
    for (const user of users) {
      // Admins have access to all agents
      if (user.role === 'admin') {
        userAgentMap.set(user.id, {
          count: allAgents.length,
          agents: allAgents
        });
      } else {
        // Regular users have specific assignments
        const assignedAgentIds = Array.from(this.userAgents.values())
          .filter(ua => ua.userId === user.id)
          .map(ua => ua.agentId);
        
        const assignedAgents = allAgents
          .filter(agent => assignedAgentIds.includes(agent.id));
        
        userAgentMap.set(user.id, {
          count: assignedAgents.length,
          agents: assignedAgents
        });
      }
    }
    
    return userAgentMap;
  }

  // Agent methods - WITH DATA ISOLATION
  async getAgent(userId: string, agentId: string): Promise<Agent | undefined> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    
    // Check if user has access to this agent
    if (!allowedAgentIds.includes(agentId)) {
      return undefined;
    }
    
    return this.agents.get(agentId);
  }

  async getAllAgents(userId: string): Promise<Agent[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const agents = Array.from(this.agents.values());
    
    // Filter agents based on user's access
    return agents.filter(agent => allowedAgentIds.includes(agent.id));
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const agent: Agent = {
      ...insertAgent,
      id: randomUUID(),
      createdAt: new Date(),
      description: insertAgent.description || null,
      isActive: insertAgent.isActive ?? true,
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent = { ...agent, ...updates };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  // Call methods - WITH DATA ISOLATION
  async getCall(userId: string, callId: string): Promise<Call | undefined> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const call = this.calls.get(callId);
    
    // Check if call belongs to an agent the user has access to
    if (!call || !allowedAgentIds.includes(call.agentId)) {
      return undefined;
    }
    
    return call;
  }

  async getAllCalls(userId: string): Promise<Call[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const calls = Array.from(this.calls.values());
    
    // Filter calls based on user's assigned agents
    return calls.filter(call => allowedAgentIds.includes(call.agentId));
  }

  async getCallsByAgent(userId: string, agentId: string): Promise<Call[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    
    // Check if user has access to this agent
    if (!allowedAgentIds.includes(agentId)) {
      return [];
    }
    
    return Array.from(this.calls.values()).filter(call => call.agentId === agentId);
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const call: Call = {
      ...insertCall,
      id: randomUUID(),
      createdAt: new Date(),
      endTime: insertCall.endTime || null,
      duration: insertCall.duration || null,
      sentiment: insertCall.sentiment || null,
      outcome: insertCall.outcome || null,
      recordingUrl: insertCall.recordingUrl || null,
      transcript: insertCall.transcript || null,
      analysis: insertCall.analysis || null,
      metadata: insertCall.metadata || null,
    };
    this.calls.set(call.id, call);
    return call;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const call = this.calls.get(id);
    if (!call) return undefined;
    
    const updatedCall = { ...call, ...updates };
    this.calls.set(id, updatedCall);
    return updatedCall;
  }

  // Performance metric methods - WITH DATA ISOLATION
  async getPerformanceMetric(userId: string, metricId: string): Promise<PerformanceMetric | undefined> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const metric = this.performanceMetrics.get(metricId);
    
    // Check if metric belongs to an agent the user has access to
    if (!metric || !allowedAgentIds.includes(metric.agentId)) {
      return undefined;
    }
    
    return metric;
  }

  async getPerformanceMetricsByCall(userId: string, callId: string): Promise<PerformanceMetric[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    
    // First verify the call belongs to an allowed agent
    const call = await this.getCall(userId, callId);
    if (!call) {
      return [];
    }
    
    return Array.from(this.performanceMetrics.values())
      .filter(metric => metric.callId === callId && allowedAgentIds.includes(metric.agentId));
  }

  async getPerformanceMetricsByAgent(userId: string, agentId: string): Promise<PerformanceMetric[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    
    // Check if user has access to this agent
    if (!allowedAgentIds.includes(agentId)) {
      return [];
    }
    
    return Array.from(this.performanceMetrics.values()).filter(metric => metric.agentId === agentId);
  }

  async getPerformanceMetrics(userId: string): Promise<PerformanceMetric[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const metrics = Array.from(this.performanceMetrics.values());
    
    // Filter metrics based on user's assigned agents
    return metrics.filter(metric => allowedAgentIds.includes(metric.agentId));
  }

  async createPerformanceMetric(insertMetric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const metric: PerformanceMetric = {
      ...insertMetric,
      id: randomUUID(),
      timestamp: new Date(),
      speechToTextLatency: insertMetric.speechToTextLatency || null,
      elevenLabsLatency: insertMetric.elevenLabsLatency || null,
      liveKitLatency: insertMetric.liveKitLatency || null,
      totalLatency: insertMetric.totalLatency || null,
      responseTime: insertMetric.responseTime || null,
      audioQuality: insertMetric.audioQuality || null,
      successRate: insertMetric.successRate || null,
    };
    this.performanceMetrics.set(metric.id, metric);
    return metric;
  }

  // LiveKit room methods - WITH DATA ISOLATION
  async getLiveKitRoom(userId: string, roomId: string): Promise<LiveKitRoom | undefined> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const room = this.liveKitRooms.get(roomId);
    
    if (!room) {
      return undefined;
    }
    
    // Check if any calls in this room belong to allowed agents
    const roomCalls = Array.from(this.calls.values())
      .filter(call => call.metadata && (call.metadata as any).roomId === room.roomId);
    
    const hasAccess = roomCalls.some(call => allowedAgentIds.includes(call.agentId));
    
    if (!hasAccess) {
      return undefined;
    }
    
    return room;
  }

  async getAllLiveKitRooms(userId: string): Promise<LiveKitRoom[]> {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    const rooms = Array.from(this.liveKitRooms.values());
    
    // Filter rooms based on whether user has access to calls in those rooms
    return rooms.filter(room => {
      const roomCalls = Array.from(this.calls.values())
        .filter(call => call.metadata && (call.metadata as any).roomId === room.roomId);
      
      return roomCalls.some(call => allowedAgentIds.includes(call.agentId));
    });
  }

  async createLiveKitRoom(insertRoom: InsertLiveKitRoom): Promise<LiveKitRoom> {
    const room: LiveKitRoom = {
      ...insertRoom,
      id: randomUUID(),
      createdAt: new Date(),
      isActive: insertRoom.isActive ?? true,
      participantCount: insertRoom.participantCount || 0,
    };
    this.liveKitRooms.set(room.id, room);
    return room;
  }

  async updateLiveKitRoom(id: string, updates: Partial<LiveKitRoom>): Promise<LiveKitRoom | undefined> {
    const room = this.liveKitRooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.liveKitRooms.set(id, updatedRoom);
    return updatedRoom;
  }

  // Dashboard methods - WITH DATA ISOLATION
  async getDashboardStats(userId: string) {
    const allowedAgentIds = await this.getAssignedAgentIds(userId);
    
    // Get filtered calls based on user's assigned agents
    const allCalls = Array.from(this.calls.values());
    const calls = allCalls.filter(call => allowedAgentIds.includes(call.agentId));
    
    // Get only rooms that have calls from allowed agents
    const activeRooms = Array.from(this.liveKitRooms.values()).filter(room => {
      if (!room.isActive) return false;
      
      // Check if any calls in this room belong to allowed agents
      const roomCalls = allCalls.filter(call => 
        call.metadata && (call.metadata as any).roomId === room.roomId
      );
      
      return roomCalls.some(call => allowedAgentIds.includes(call.agentId));
    });
    
    // Get filtered metrics based on user's assigned agents
    const allMetrics = Array.from(this.performanceMetrics.values());
    const metrics = allMetrics.filter(m => allowedAgentIds.includes(m.agentId));

    const totalCalls = calls.length;
    const avgHandleTime = calls.length > 0 
      ? Math.floor(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length)
      : 0;
    
    const avgHandleTimeFormatted = `${Math.floor(avgHandleTime / 60)}m ${avgHandleTime % 60}s`;

    const elevenLabsLatencies = metrics
      .filter(m => m.elevenLabsLatency && m.elevenLabsLatency > 0)
      .map(m => m.elevenLabsLatency!)
      .sort((a, b) => a - b);
    
    const elevenLabsLatencyP95 = elevenLabsLatencies.length > 0 
      ? elevenLabsLatencies[Math.floor(elevenLabsLatencies.length * 0.95)]
      : 0;

    // Generate call volume data based on actual calls from allowed agents
    const callVolumeData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Count actual calls from that day for allowed agents
      const dayCalls = calls.filter(call => {
        const callTime = call.startTime.getTime();
        return callTime >= dayStart.getTime() && callTime <= dayEnd.getTime();
      });
      
      // Count by platform (get agent platform)
      let elevenLabsCount = 0;
      let liveKitCount = 0;
      
      dayCalls.forEach(call => {
        const agent = this.agents.get(call.agentId);
        if (agent?.platform === 'elevenlabs') {
          elevenLabsCount++;
        } else if (agent?.platform === 'livekit') {
          liveKitCount++;
        }
      });
      
      // If no data for that day, use small random values for demo
      if (elevenLabsCount === 0 && liveKitCount === 0) {
        elevenLabsCount = Math.floor(Math.random() * 10) + 5;
        liveKitCount = Math.floor(Math.random() * 8) + 3;
      }
      
      return {
        time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        elevenlabs: elevenLabsCount,
        livekit: liveKitCount,
      };
    });

    const recentCalls = calls
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 5);

    return {
      totalCalls,
      avgHandleTime: avgHandleTimeFormatted,
      elevenLabsLatencyP95,
      activeRooms: activeRooms.length,
      callVolumeData,
      recentCalls,
    };
  }
}

export const storage = new MemStorage();