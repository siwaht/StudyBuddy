import { 
  type User, type InsertUser,
  type Agent, type InsertAgent,
  type Call, type InsertCall,
  type PerformanceMetric, type InsertPerformanceMetric,
  type LiveKitRoom, type InsertLiveKitRoom,
  type UserAgent, type InsertUserAgent,
  type Account, type InsertAccount
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
  deleteUser(id: string): Promise<boolean>;
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
  deleteAgent(agentId: string): Promise<boolean>;

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

  // Advanced Search - REQUIRES USER ID FOR DATA ISOLATION
  searchCalls(userId: string, params: {
    q?: string;
    agentId?: string;
    sentiment?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    durationMin?: number;
    durationMax?: number;
    hasRecording?: boolean;
    sortBy?: 'date' | 'duration' | 'sentiment';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    calls: Call[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }>;
  
  // Search suggestions
  getSearchSuggestions(userId: string, query: string): Promise<string[]>;
  
  // Analytics data
  getAnalyticsData(userId: string, params: {
    dateFrom: Date;
    dateTo: Date;
    compareFrom?: Date;
    compareTo?: Date;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<{
    metrics: {
      totalCalls: number;
      avgDuration: number;
      avgSentiment: number;
      resolutionRate: number;
      comparisons?: {
        totalCalls: number;
        avgDuration: number;
        avgSentiment: number;
        resolutionRate: number;
      };
    };
    trends: Array<{
      timestamp: string;
      calls: number;
      avgDuration: number;
      sentiment: { positive: number; negative: number; neutral: number };
    }>;
    agentPerformance: Array<{
      agentId: string;
      agentName: string;
      totalCalls: number;
      avgDuration: number;
      avgSentiment: number;
      resolutionRate: number;
    }>;
    peakHours: Array<{
      hour: number;
      calls: number;
      avgWaitTime: number;
    }>;
  }>;

  // Accounts Management
  getAccount(accountId: string): Promise<Account | undefined>;
  getAllAccounts(): Promise<Account[]>;
  getAccountsByService(service: 'elevenlabs' | 'livekit'): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(accountId: string, updates: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(accountId: string): Promise<boolean>;

  // Permissions Management
  getUserPermissions(userId: string): Promise<Record<string, boolean>>;
  updateUserPermissions(userId: string, permissions: Record<string, boolean>): Promise<boolean>;
  checkUserPermission(userId: string, permission: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private agents: Map<string, Agent> = new Map();
  private calls: Map<string, Call> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private liveKitRooms: Map<string, LiveKitRoom> = new Map();
  private userAgents: Map<string, UserAgent> = new Map();
  private accounts: Map<string, Account> = new Map();

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
        permissions: {},
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
        permissions: {},
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
        permissions: {},
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
        permissions: {},
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
        permissions: {},
        lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        createdAt: new Date(),
      },
    ];

    users.forEach(user => this.users.set(user.id, user));

    // Seed accounts for ElevenLabs and LiveKit
    const accounts = [
      {
        id: randomUUID(),
        name: "Production ElevenLabs",
        service: "elevenlabs" as const,
        encryptedApiKey: "encrypted_elevenlabs_key_production",
        isActive: true,
        lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: { workspace: "Production Workspace" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Development ElevenLabs",
        service: "elevenlabs" as const,
        encryptedApiKey: "encrypted_elevenlabs_key_dev",
        isActive: true,
        lastSynced: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        metadata: { workspace: "Dev Workspace" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Main LiveKit Account",
        service: "livekit" as const,
        encryptedApiKey: "encrypted_livekit_key_main",
        isActive: true,
        lastSynced: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        metadata: { region: "us-east-1" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Backup LiveKit Account",
        service: "livekit" as const,
        encryptedApiKey: "encrypted_livekit_key_backup",
        isActive: false,
        lastSynced: null,
        metadata: { region: "eu-west-1" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    accounts.forEach(account => this.accounts.set(account.id, account));

    // Get account IDs for linking agents
    const prodElevenLabsId = accounts.find(a => a.name === "Production ElevenLabs")?.id;
    const devElevenLabsId = accounts.find(a => a.name === "Development ElevenLabs")?.id;
    const mainLiveKitId = accounts.find(a => a.name === "Main LiveKit Account")?.id;

    // Seed agents linked to accounts
    const agents = [
      {
        id: randomUUID(),
        name: "SalesBot",
        platform: "elevenlabs" as const,
        accountId: prodElevenLabsId || null,
        description: "High quality voice agent for sales inquiries",
        externalId: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "SupportRouter",
        platform: "livekit" as const,
        accountId: mainLiveKitId || null,
        description: "Advanced technical support worker with GPT-4o integration",
        externalId: null,
        metadata: null,
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "IVR Assistant",
        platform: "elevenlabs" as const,
        accountId: devElevenLabsId || null,
        description: "Initial call routing and FAQ handling",
        externalId: null,
        metadata: null,
        isActive: false,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Customer Service Bot",
        platform: "livekit" as const,
        accountId: mainLiveKitId || null,
        description: "General customer service inquiries",
        externalId: null,
        metadata: null,
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
    const user = this.users.get(id);
    if (user && user.permissions === undefined) {
      user.permissions = {};
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(user => user.username === username);
    if (user && user.permissions === undefined) {
      user.permissions = {};
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(user => user.email === email);
    if (user && user.permissions === undefined) {
      user.permissions = {};
    }
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      createdAt: new Date(),
      role: insertUser.role || "user",
      isActive: insertUser.isActive ?? true,
      lastActive: insertUser.lastActive || null,
      permissions: insertUser.permissions || {},
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

  async deleteUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    // Delete user-agent assignments for this user
    const userAgentIds = Array.from(this.userAgents.keys()).filter(key => {
      const userAgent = this.userAgents.get(key);
      return userAgent && userAgent.userId === id;
    });
    
    for (const userAgentId of userAgentIds) {
      this.userAgents.delete(userAgentId);
    }
    
    // Delete the user
    return this.users.delete(id);
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
      accountId: insertAgent.accountId || null,
      description: insertAgent.description || null,
      externalId: insertAgent.externalId || null,
      metadata: insertAgent.metadata || null,
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

  async deleteAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // Remove all user-agent assignments for this agent
    const userAgentIds = Array.from(this.userAgents.keys()).filter(key => {
      const userAgent = this.userAgents.get(key);
      return userAgent && userAgent.agentId === agentId;
    });
    
    for (const userAgentId of userAgentIds) {
      this.userAgents.delete(userAgentId);
    }
    
    // Delete the agent
    return this.agents.delete(agentId);
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

  // Advanced Search Implementation
  async searchCalls(userId: string, params: {
    q?: string;
    agentId?: string;
    sentiment?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    durationMin?: number;
    durationMax?: number;
    hasRecording?: boolean;
    sortBy?: 'date' | 'duration' | 'sentiment';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    calls: Call[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    // Get user's accessible agents
    const userAgentIds = await this.getAssignedAgentIds(userId);
    
    // Start with all calls
    let filteredCalls = Array.from(this.calls.values());
    
    // Filter by user's accessible agents only
    filteredCalls = filteredCalls.filter(call => 
      userAgentIds.includes(call.agentId)
    );
    
    // Apply search query
    if (params.q) {
      const query = params.q.toLowerCase();
      filteredCalls = filteredCalls.filter(call => {
        // Search in transcript
        const transcriptMatch = Array.isArray(call.transcript) && 
          (call.transcript as any[]).some((entry: any) => 
            entry.text?.toLowerCase().includes(query)
          );
        
        // Search in agent name
        const agent = this.agents.get(call.agentId);
        const agentMatch = agent?.name.toLowerCase().includes(query);
        
        // Search in analysis summary
        const analysisMatch = (call.analysis as any)?.summary?.toLowerCase().includes(query);
        
        // Search in outcome
        const outcomeMatch = call.outcome?.toLowerCase().includes(query);
        
        return transcriptMatch || agentMatch || analysisMatch || outcomeMatch;
      });
    }
    
    // Filter by agent
    if (params.agentId) {
      filteredCalls = filteredCalls.filter(call => call.agentId === params.agentId);
    }
    
    // Filter by sentiment
    if (params.sentiment && params.sentiment.length > 0) {
      filteredCalls = filteredCalls.filter(call => 
        params.sentiment!.includes(call.sentiment || 'neutral')
      );
    }
    
    // Filter by date range
    if (params.dateFrom) {
      filteredCalls = filteredCalls.filter(call => 
        new Date(call.startTime) >= params.dateFrom!
      );
    }
    if (params.dateTo) {
      filteredCalls = filteredCalls.filter(call => 
        new Date(call.startTime) <= params.dateTo!
      );
    }
    
    // Filter by duration
    if (params.durationMin !== undefined) {
      filteredCalls = filteredCalls.filter(call => 
        (call.duration || 0) >= params.durationMin!
      );
    }
    if (params.durationMax !== undefined) {
      filteredCalls = filteredCalls.filter(call => 
        (call.duration || 0) <= params.durationMax!
      );
    }
    
    // Filter by recording status
    if (params.hasRecording !== undefined) {
      filteredCalls = filteredCalls.filter(call => 
        params.hasRecording ? !!call.recordingUrl : !call.recordingUrl
      );
    }
    
    // Sort results
    const sortBy = params.sortBy || 'date';
    const sortOrder = params.sortOrder || 'desc';
    
    filteredCalls.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'sentiment':
          const sentimentOrder = { 'positive': 3, 'neutral': 2, 'negative': 1 };
          const aScore = sentimentOrder[a.sentiment as keyof typeof sentimentOrder] || 2;
          const bScore = sentimentOrder[b.sentiment as keyof typeof sentimentOrder] || 2;
          comparison = aScore - bScore;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Pagination
    const page = params.page || 1;
    const pageSize = params.limit || 10;
    const total = filteredCalls.length;
    const pages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedCalls = filteredCalls.slice(start, start + pageSize);
    
    return {
      calls: paginatedCalls,
      total,
      page,
      pageSize,
      pages
    };
  }
  
  async getSearchSuggestions(userId: string, query: string): Promise<string[]> {
    const userAgentIds = await this.getAssignedAgentIds(userId);
    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();
    
    // Get agent names
    for (const agentId of userAgentIds) {
      const agent = this.agents.get(agentId);
      if (agent && agent.name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(agent.name);
      }
    }
    
    // Get common words from transcripts (limited for performance)
    const calls = Array.from(this.calls.values())
      .filter(call => userAgentIds.includes(call.agentId))
      .slice(0, 100); // Limit to recent 100 calls
    
    for (const call of calls) {
      if (Array.isArray(call.transcript)) {
        const transcript = call.transcript as any[];
        for (const entry of transcript.slice(0, 10)) { // First 10 transcript entries
          if (entry.text) {
            const words = entry.text.split(/\s+/).slice(0, 5); // First 5 words per entry
            for (const word of words) {
              if (word.toLowerCase().includes(lowerQuery) && word.length > 3) {
                suggestions.add(word);
                if (suggestions.size >= 10) break;
              }
            }
          }
        }
      }
      if (suggestions.size >= 10) break;
    }
    
    return Array.from(suggestions).slice(0, 10);
  }
  
  async getAnalyticsData(userId: string, params: {
    dateFrom: Date;
    dateTo: Date;
    compareFrom?: Date;
    compareTo?: Date;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<any> {
    const userAgentIds = await this.getAssignedAgentIds(userId);
    
    // Get calls in date range
    const calls = Array.from(this.calls.values())
      .filter(call => {
        const callDate = new Date(call.startTime);
        return userAgentIds.includes(call.agentId) &&
               callDate >= params.dateFrom &&
               callDate <= params.dateTo;
      });
    
    // Calculate metrics
    const totalCalls = calls.length;
    const avgDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0) / (totalCalls || 1);
    
    const sentimentScores = { 'positive': 1, 'neutral': 0, 'negative': -1 };
    const avgSentiment = calls.reduce((sum, call) => 
      sum + (sentimentScores[call.sentiment as keyof typeof sentimentScores] || 0), 0
    ) / (totalCalls || 1);
    
    const resolutionRate = calls.filter(call => 
      call.outcome === 'resolved' || call.outcome === 'Sale Closed' || call.outcome === 'Resolved'
    ).length / (totalCalls || 1);
    
    // Get comparison data if requested
    let comparisons;
    if (params.compareFrom && params.compareTo) {
      const compareCalls = Array.from(this.calls.values())
        .filter(call => {
          const callDate = new Date(call.startTime);
          return userAgentIds.includes(call.agentId) &&
                 callDate >= params.compareFrom! &&
                 callDate <= params.compareTo!;
        });
      
      comparisons = {
        totalCalls: compareCalls.length,
        avgDuration: compareCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / (compareCalls.length || 1),
        avgSentiment: compareCalls.reduce((sum, call) => 
          sum + (sentimentScores[call.sentiment as keyof typeof sentimentScores] || 0), 0
        ) / (compareCalls.length || 1),
        resolutionRate: compareCalls.filter(call => 
          call.outcome === 'resolved' || call.outcome === 'Sale Closed' || call.outcome === 'Resolved'
        ).length / (compareCalls.length || 1)
      };
    }
    
    // Calculate trends (simplified for now)
    const trends = [];
    const groupBy = params.groupBy || 'day';
    
    // Group calls by time period
    const grouped = new Map<string, Call[]>();
    for (const call of calls) {
      const date = new Date(call.startTime);
      let key = '';
      
      switch (groupBy) {
        case 'hour':
          key = `${date.toISOString().slice(0, 13)}:00`;
          break;
        case 'day':
          key = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          key = date.toISOString().slice(0, 7);
          break;
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(call);
    }
    
    // Calculate metrics for each time period
    for (const [timestamp, groupCalls] of Array.from(grouped.entries())) {
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      for (const call of groupCalls) {
        const sentiment = call.sentiment || 'neutral';
        sentimentCounts[sentiment as keyof typeof sentimentCounts]++;
      }
      
      trends.push({
        timestamp,
        calls: groupCalls.length,
        avgDuration: groupCalls.reduce((sum: number, call: Call) => sum + (call.duration || 0), 0) / groupCalls.length,
        sentiment: sentimentCounts
      });
    }
    
    // Agent performance
    const agentPerformance = [];
    for (const agentId of userAgentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;
      
      const agentCalls = calls.filter(call => call.agentId === agentId);
      if (agentCalls.length === 0) continue;
      
      agentPerformance.push({
        agentId,
        agentName: agent.name,
        totalCalls: agentCalls.length,
        avgDuration: agentCalls.reduce((sum: number, call: Call) => sum + (call.duration || 0), 0) / agentCalls.length,
        avgSentiment: agentCalls.reduce((sum: number, call: Call) => 
          sum + (sentimentScores[call.sentiment as keyof typeof sentimentScores] || 0), 0
        ) / agentCalls.length,
        resolutionRate: agentCalls.filter(call => 
          call.outcome === 'resolved' || call.outcome === 'Sale Closed' || call.outcome === 'Resolved'
        ).length / agentCalls.length
      });
    }
    
    // Peak hours analysis
    const hourlyStats = new Map<number, { calls: number; totalWait: number }>();
    for (const call of calls) {
      const hour = new Date(call.startTime).getHours();
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { calls: 0, totalWait: 0 });
      }
      const stats = hourlyStats.get(hour)!;
      stats.calls++;
      // Simulate wait time based on metadata or use a default
      const metadata = call.metadata as any;
      stats.totalWait += metadata?.waitTime || 30;
    }
    
    const peakHours = Array.from(hourlyStats.entries())
      .map(([hour, stats]) => ({
        hour,
        calls: stats.calls,
        avgWaitTime: stats.totalWait / stats.calls
      }))
      .sort((a, b) => b.calls - a.calls);
    
    return {
      metrics: {
        totalCalls,
        avgDuration,
        avgSentiment,
        resolutionRate,
        comparisons
      },
      trends,
      agentPerformance,
      peakHours
    };
  }

  // Accounts Management
  async getAccount(accountId: string): Promise<Account | undefined> {
    return this.accounts.get(accountId);
  }

  async getAllAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccountsByService(service: 'elevenlabs' | 'livekit'): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.service === service);
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const id = randomUUID();
    const newAccount: Account = {
      id,
      ...account,
      lastSynced: null,
      isActive: account.isActive ?? true,
      metadata: account.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.accounts.set(id, newAccount);
    return newAccount;
  }

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account | undefined> {
    const existing = this.accounts.get(accountId);
    if (!existing) {
      return undefined;
    }
    
    const updated: Account = {
      ...existing,
      ...updates,
      id: existing.id, // Never change the ID
      updatedAt: new Date(),
    };
    this.accounts.set(accountId, updated);
    return updated;
  }

  async deleteAccount(accountId: string): Promise<boolean> {
    if (this.accounts.has(accountId)) {
      this.accounts.delete(accountId);
      return true;
    }
    return false;
  }

  // Permissions Management
  async getUserPermissions(userId: string): Promise<Record<string, boolean>> {
    const user = this.users.get(userId);
    if (!user) return {};
    return (user.permissions as Record<string, boolean>) || {};
  }

  async updateUserPermissions(userId: string, permissions: Record<string, boolean>): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    user.permissions = permissions;
    this.users.set(userId, user);
    return true;
  }

  async checkUserPermission(userId: string, permission: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Admins have all permissions
    if (user.role === 'admin') return true;
    
    const permissions = (user.permissions as Record<string, boolean>) || {};
    return permissions[permission] === true;
  }
}

export const storage = new MemStorage();