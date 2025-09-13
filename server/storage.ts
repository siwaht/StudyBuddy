import { 
  users, agents, calls, performanceMetrics, liveKitRooms, userAgents, accounts,
  phoneNumbers, syncHistory, playgroundSessions,
  type User, type InsertUser,
  type Agent, type InsertAgent,
  type Call, type InsertCall,
  type PerformanceMetric, type InsertPerformanceMetric,
  type LiveKitRoom, type InsertLiveKitRoom,
  type UserAgent, type InsertUserAgent,
  type Account, type InsertAccount,
  type PhoneNumber, type InsertPhoneNumber,
  type SyncHistory, type InsertSyncHistory,
  type PlaygroundSession, type InsertPlaygroundSession
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, desc, asc, between, like, inArray, gte, lte, not, isNull, isNotNull } from "drizzle-orm";
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

  // Phone Numbers Management
  getPhoneNumber(phoneNumberId: string): Promise<PhoneNumber | undefined>;
  getAllPhoneNumbers(): Promise<PhoneNumber[]>;
  getPhoneNumbersByAgent(agentId: string): Promise<PhoneNumber[]>;
  createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber>;
  updatePhoneNumber(id: string, updates: Partial<PhoneNumber>): Promise<PhoneNumber | undefined>;
  deletePhoneNumber(id: string): Promise<boolean>;

  // Sync History Management
  getSyncHistory(agentId: string): Promise<SyncHistory[]>;
  getLatestSync(agentId: string): Promise<SyncHistory | undefined>;
  createSyncHistory(sync: InsertSyncHistory): Promise<SyncHistory>;
  updateSyncHistory(id: string, updates: Partial<SyncHistory>): Promise<SyncHistory | undefined>;

  // Playground Sessions Management
  getPlaygroundSession(sessionId: string): Promise<PlaygroundSession | undefined>;
  getPlaygroundSessionsByUser(userId: string): Promise<PlaygroundSession[]>;
  getPlaygroundSessionsByAgent(agentId: string): Promise<PlaygroundSession[]>;
  createPlaygroundSession(session: InsertPlaygroundSession): Promise<PlaygroundSession>;
  updatePlaygroundSession(id: string, updates: Partial<PlaygroundSession>): Promise<PlaygroundSession | undefined>;

  // Advanced Sync Operations
  syncAgent(agentId: string, userId: string): Promise<{
    conversations: number;
    transcripts: number;
    analytics: number;
    errors: string[];
  }>;
  bulkImportConversations(agentId: string, conversations: any[]): Promise<{
    imported: number;
    skipped: number;
    failed: number;
  }>;
  importConversationFromElevenLabs(agentId: string, conversation: any): Promise<Call | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedDataAsync();
  }

  private async seedDataAsync() {
    // Check if we already have users
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await this.seedData();
    }
  }

  private async seedData() {
    // Seed users - 2 admins and 3 regular users with properly hashed passwords
    // Default password for all test users: "password123"
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const seedUsers = await db.insert(users).values([
      {
        username: "alice.johnson",
        email: "alice@company.com",
        password: hashedPassword,
        role: "admin",
        isActive: true,
        permissions: {},
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        username: "admin.smith",
        email: "admin.smith@company.com",
        password: hashedPassword,
        role: "admin",
        isActive: true,
        permissions: {},
        lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        username: "bob.wilson",
        email: "bob@company.com",
        password: hashedPassword,
        role: "user",
        isActive: true,
        permissions: {},
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        username: "sarah.connors",
        email: "sarah@company.com",
        password: hashedPassword,
        role: "user",
        isActive: true,
        permissions: {},
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        username: "john.doe",
        email: "john@company.com",
        password: hashedPassword,
        role: "user",
        isActive: true,
        permissions: {},
        lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
    ]).returning();

    // Seed accounts for ElevenLabs and LiveKit
    const seedAccounts = await db.insert(accounts).values([
      {
        name: "Production ElevenLabs",
        service: "elevenlabs",
        encryptedApiKey: "encrypted_elevenlabs_key_production",
        isActive: true,
        lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: { workspace: "Production Workspace" },
      },
      {
        name: "Development ElevenLabs",
        service: "elevenlabs",
        encryptedApiKey: "encrypted_elevenlabs_key_dev",
        isActive: true,
        lastSynced: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        metadata: { workspace: "Dev Workspace" },
      },
      {
        name: "Main LiveKit Account",
        service: "livekit",
        encryptedApiKey: "encrypted_livekit_key_main",
        isActive: true,
        lastSynced: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        metadata: { region: "us-east-1" },
      },
      {
        name: "Backup LiveKit Account",
        service: "livekit",
        encryptedApiKey: "encrypted_livekit_key_backup",
        isActive: false,
        lastSynced: null,
        metadata: { region: "eu-west-1" },
      },
    ]).returning();

    // Get account IDs for linking agents
    const prodElevenLabsId = seedAccounts.find(a => a.name === "Production ElevenLabs")?.id;
    const devElevenLabsId = seedAccounts.find(a => a.name === "Development ElevenLabs")?.id;
    const mainLiveKitId = seedAccounts.find(a => a.name === "Main LiveKit Account")?.id;

    // Seed agents linked to accounts
    const seedAgents = await db.insert(agents).values([
      {
        name: "SalesBot",
        platform: "elevenlabs",
        accountId: prodElevenLabsId || null,
        description: "High quality voice agent for sales inquiries",
        externalId: null,
        metadata: null,
        isActive: true,
      },
      {
        name: "SupportRouter",
        platform: "livekit",
        accountId: mainLiveKitId || null,
        description: "Advanced technical support worker with GPT-4o integration",
        externalId: null,
        metadata: null,
        isActive: true,
      },
      {
        name: "IVR Assistant",
        platform: "elevenlabs",
        accountId: devElevenLabsId || null,
        description: "Initial call routing and FAQ handling",
        externalId: null,
        metadata: null,
        isActive: false,
      },
      {
        name: "Customer Service Bot",
        platform: "livekit",
        accountId: mainLiveKitId || null,
        description: "General customer service inquiries",
        externalId: null,
        metadata: null,
        isActive: true,
      },
    ]).returning();

    // Create user-agent assignments
    const bobId = seedUsers.find(u => u.username === "bob.wilson")?.id!;
    const sarahId = seedUsers.find(u => u.username === "sarah.connors")?.id!;
    const johnId = seedUsers.find(u => u.username === "john.doe")?.id!;
    
    const salesBotId = seedAgents.find(a => a.name === "SalesBot")?.id!;
    const supportRouterId = seedAgents.find(a => a.name === "SupportRouter")?.id!;
    const ivrAssistantId = seedAgents.find(a => a.name === "IVR Assistant")?.id!;
    const customerServiceId = seedAgents.find(a => a.name === "Customer Service Bot")?.id!;

    // Bob gets SalesBot and IVR Assistant
    await db.insert(userAgents).values([
      { userId: bobId, agentId: salesBotId },
      { userId: bobId, agentId: ivrAssistantId },
    ]);

    // Sarah gets SupportRouter and Customer Service Bot
    await db.insert(userAgents).values([
      { userId: sarahId, agentId: supportRouterId },
      { userId: sarahId, agentId: customerServiceId },
    ]);

    // John gets only Customer Service Bot
    await db.insert(userAgents).values([
      { userId: johnId, agentId: customerServiceId },
    ]);

    // Seed LiveKit rooms
    await db.insert(liveKitRooms).values([
      {
        roomId: "RM_A9B8C7",
        name: "Sales Conference",
        isActive: true,
        participantCount: 3,
      },
      {
        roomId: "RM_D4E5F6",
        name: "Support Room",
        isActive: true,
        participantCount: 2,
      },
    ]);

    // Seed calls
    const seedCalls = await db.insert(calls).values([
      {
        id: "C-1055",
        agentId: salesBotId,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
        duration: 312, // 5m 12s
        sentiment: "positive",
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
      },
      {
        id: "C-1056",
        agentId: supportRouterId,
        startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000 + 65 * 1000),
        duration: 65, // 1m 05s
        sentiment: "negative",
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
      },
      {
        id: "C-1057",
        agentId: customerServiceId,
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 3 * 60 * 60 * 1000 + 3 * 60 * 1000),
        duration: 180, // 3m
        sentiment: "neutral",
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
      },
    ]).returning();

    // Seed performance metrics
    for (const call of seedCalls) {
      await db.insert(performanceMetrics).values({
        agentId: call.agentId,
        callId: call.id,
        speechToTextLatency: (call.analysis as any)?.latencyWaterfall?.speechToText || 0,
        elevenLabsLatency: (call.analysis as any)?.latencyWaterfall?.elevenLabsTTS || 0,
        liveKitLatency: (call.analysis as any)?.latencyWaterfall?.liveKitTransport || 0,
        totalLatency: Object.values((call.analysis as any)?.latencyWaterfall || {}).reduce((a: number, b: any) => a + b, 0),
        responseTime: 95,
        audioQuality: "4.6",
        successRate: "0.985",
        timestamp: call.startTime,
      });
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Delete user-agent assignments first
    await db.delete(userAgents).where(eq(userAgents.userId, id));
    
    // Delete the user
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Authentication methods
  async validatePassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // User-Agent Assignment methods
  async getAssignedAgentIds(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // All users (including admins) see only their assigned agents
    // This ensures proper data isolation and control
    const assignments = await db.select({ agentId: userAgents.agentId })
      .from(userAgents)
      .where(eq(userAgents.userId, userId));
    
    return assignments.map(a => a.agentId);
  }

  async assignAgents(userId: string, agentIds: string[]): Promise<void> {
    // Remove existing assignments
    await db.delete(userAgents).where(eq(userAgents.userId, userId));
    
    // Create new assignments
    if (agentIds.length > 0) {
      await db.insert(userAgents).values(
        agentIds.map(agentId => ({ userId, agentId }))
      );
    }
  }

  async addAgentsToUser(userId: string, agentIds: string[]): Promise<void> {
    // Get existing assignments
    const existing = await db.select({ agentId: userAgents.agentId })
      .from(userAgents)
      .where(eq(userAgents.userId, userId));
    
    const existingIds = existing.map(e => e.agentId);
    
    // Filter out agents that are already assigned
    const newAgentIds = agentIds.filter(id => !existingIds.includes(id));
    
    // Add new assignments
    if (newAgentIds.length > 0) {
      await db.insert(userAgents).values(
        newAgentIds.map(agentId => ({ userId, agentId }))
      );
    }
  }

  async removeAgentAssignment(userId: string, agentId: string): Promise<void> {
    await db.delete(userAgents)
      .where(and(
        eq(userAgents.userId, userId),
        eq(userAgents.agentId, agentId)
      ));
  }

  async getUserAgents(userId: string): Promise<Agent[]> {
    const agentIds = await this.getAssignedAgentIds(userId);
    if (agentIds.length === 0) return [];
    
    return await db.select().from(agents)
      .where(inArray(agents.id, agentIds));
  }

  async getAllUserAgentAssignments(): Promise<Map<string, { count: number; agents: Agent[] }>> {
    const allUsers = await this.getAllUsers();
    const result = new Map<string, { count: number; agents: Agent[] }>();
    
    for (const user of allUsers) {
      const userAgentList = await this.getUserAgents(user.id);
      result.set(user.id, {
        count: userAgentList.length,
        agents: userAgentList
      });
    }
    
    return result;
  }

  // Agent methods
  async getAgent(userId: string, agentId: string): Promise<Agent | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Check if user has access to this agent
    const assignedIds = await this.getAssignedAgentIds(userId);
    if (!assignedIds.includes(agentId)) return undefined;
    
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
    return agent || undefined;
  }

  async getAllAgents(userId: string): Promise<Agent[]> {
    const agentIds = await this.getAssignedAgentIds(userId);
    if (agentIds.length === 0) return [];
    
    return await db.select().from(agents)
      .where(inArray(agents.id, agentIds));
  }

  // Method for admins to get ALL agents in the system (not just assigned)
  async getAllSystemAgents(userId: string): Promise<Agent[]> {
    const user = await this.getUser(userId);
    if (!user || user.role !== 'admin') return [];
    
    return await db.select().from(agents);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent).returning();
    return created;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const [updated] = await db.update(agents)
      .set(updates)
      .where(eq(agents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    // Delete related data first
    await db.delete(userAgents).where(eq(userAgents.agentId, agentId));
    
    // Get calls to delete performance metrics
    const callsToDelete = await db.select({ id: calls.id })
      .from(calls)
      .where(eq(calls.agentId, agentId));
    
    if (callsToDelete.length > 0) {
      const callIds = callsToDelete.map(c => c.id);
      await db.delete(performanceMetrics)
        .where(inArray(performanceMetrics.callId, callIds));
    }
    
    await db.delete(calls).where(eq(calls.agentId, agentId));
    await db.delete(performanceMetrics).where(eq(performanceMetrics.agentId, agentId));
    
    const result = await db.delete(agents).where(eq(agents.id, agentId));
    return (result.rowCount ?? 0) > 0;
  }

  // Call methods
  async getCall(userId: string, callId: string): Promise<Call | undefined> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (assignedAgentIds.length === 0) return undefined;
    
    const [call] = await db.select().from(calls)
      .where(and(
        eq(calls.id, callId),
        inArray(calls.agentId, assignedAgentIds)
      ));
    
    return call || undefined;
  }

  async getAllCalls(userId: string): Promise<Call[]> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (assignedAgentIds.length === 0) return [];
    
    return await db.select().from(calls)
      .where(inArray(calls.agentId, assignedAgentIds))
      .orderBy(desc(calls.startTime));
  }

  async getCallsByAgent(userId: string, agentId: string): Promise<Call[]> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (!assignedAgentIds.includes(agentId)) return [];
    
    return await db.select().from(calls)
      .where(eq(calls.agentId, agentId))
      .orderBy(desc(calls.startTime));
  }

  async createCall(call: InsertCall): Promise<Call> {
    const [created] = await db.insert(calls).values(call).returning();
    return created;
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    const [updated] = await db.update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return updated || undefined;
  }

  // Performance Metrics methods
  async getPerformanceMetric(userId: string, metricId: string): Promise<PerformanceMetric | undefined> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (assignedAgentIds.length === 0) return undefined;
    
    const [metric] = await db.select().from(performanceMetrics)
      .where(and(
        eq(performanceMetrics.id, metricId),
        inArray(performanceMetrics.agentId, assignedAgentIds)
      ));
    
    return metric || undefined;
  }

  async getPerformanceMetricsByCall(userId: string, callId: string): Promise<PerformanceMetric[]> {
    const call = await this.getCall(userId, callId);
    if (!call) return [];
    
    return await db.select().from(performanceMetrics)
      .where(eq(performanceMetrics.callId, callId));
  }

  async getPerformanceMetricsByAgent(userId: string, agentId: string): Promise<PerformanceMetric[]> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (!assignedAgentIds.includes(agentId)) return [];
    
    return await db.select().from(performanceMetrics)
      .where(eq(performanceMetrics.agentId, agentId))
      .orderBy(desc(performanceMetrics.timestamp));
  }

  async getPerformanceMetrics(userId: string): Promise<PerformanceMetric[]> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (assignedAgentIds.length === 0) return [];
    
    return await db.select().from(performanceMetrics)
      .where(inArray(performanceMetrics.agentId, assignedAgentIds))
      .orderBy(desc(performanceMetrics.timestamp));
  }

  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [created] = await db.insert(performanceMetrics).values(metric).returning();
    return created;
  }

  // LiveKit Rooms methods
  async getLiveKitRoom(userId: string, roomId: string): Promise<LiveKitRoom | undefined> {
    const [room] = await db.select().from(liveKitRooms)
      .where(eq(liveKitRooms.id, roomId));
    return room || undefined;
  }

  async getAllLiveKitRooms(userId: string): Promise<LiveKitRoom[]> {
    return await db.select().from(liveKitRooms)
      .where(eq(liveKitRooms.isActive, true));
  }

  async createLiveKitRoom(room: InsertLiveKitRoom): Promise<LiveKitRoom> {
    const [created] = await db.insert(liveKitRooms).values(room).returning();
    return created;
  }

  async updateLiveKitRoom(id: string, updates: Partial<LiveKitRoom>): Promise<LiveKitRoom | undefined> {
    const [updated] = await db.update(liveKitRooms)
      .set(updates)
      .where(eq(liveKitRooms.id, id))
      .returning();
    return updated || undefined;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalCalls: number;
    avgHandleTime: string;
    elevenLabsLatencyP95: number;
    activeRooms: number;
    callVolumeData: Array<{ time: string; elevenlabs: number; livekit: number }>;
    recentCalls: Call[];
    platforms: string[];
  }> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    
    if (assignedAgentIds.length === 0) {
      return {
        totalCalls: 0,
        avgHandleTime: "0s",
        elevenLabsLatencyP95: 0,
        activeRooms: 0,
        callVolumeData: [],
        recentCalls: [],
        platforms: []
      };
    }

    // Get all calls for assigned agents
    const allCalls = await db.select().from(calls)
      .where(inArray(calls.agentId, assignedAgentIds));
    
    // Calculate average handle time
    const totalDuration = allCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const avgDuration = allCalls.length > 0 ? totalDuration / allCalls.length : 0;
    const minutes = Math.floor(avgDuration / 60);
    const seconds = Math.floor(avgDuration % 60);
    const avgHandleTime = `${minutes}m ${seconds}s`;

    // Get P95 latency for ElevenLabs
    const metrics = await db.select().from(performanceMetrics)
      .where(inArray(performanceMetrics.agentId, assignedAgentIds));
    
    const elevenLabsLatencies = metrics
      .map(m => m.elevenLabsLatency || 0)
      .filter(l => l > 0)
      .sort((a, b) => a - b);
    
    const p95Index = Math.floor(elevenLabsLatencies.length * 0.95);
    const elevenLabsLatencyP95 = elevenLabsLatencies[p95Index] || 0;

    // Get active rooms
    const activeRooms = await db.select().from(liveKitRooms)
      .where(eq(liveKitRooms.isActive, true));

    // Get agents for volume data
    const allAgents = await db.select().from(agents)
      .where(inArray(agents.id, assignedAgentIds));
    
    // Get unique platforms for assigned agents
    const platforms = Array.from(new Set(allAgents.map(a => a.platform)));

    // Generate call volume data for the last 7 days
    const callVolumeData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const daysCalls = allCalls.filter(call => {
        const callTime = new Date(call.startTime);
        return callTime >= date && callTime < nextDate;
      });
      
      const elevenLabsCalls = daysCalls.filter(call => {
        const agent = allAgents.find(a => a.id === call.agentId);
        return agent?.platform === 'elevenlabs';
      }).length;
      
      const livekitCalls = daysCalls.filter(call => {
        const agent = allAgents.find(a => a.id === call.agentId);
        return agent?.platform === 'livekit';
      }).length;
      
      callVolumeData.push({
        time: date.toLocaleDateString('en-US', { weekday: 'short' }),
        elevenlabs: elevenLabsCalls,
        livekit: livekitCalls
      });
    }

    // Get recent calls
    const recentCalls = allCalls
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 5);

    return {
      totalCalls: allCalls.length,
      avgHandleTime,
      elevenLabsLatencyP95,
      activeRooms: activeRooms.length,
      callVolumeData,
      recentCalls,
      platforms
    };
  }

  // Search calls
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
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (assignedAgentIds.length === 0) {
      return { calls: [], total: 0, page: 1, pageSize: 10, pages: 0 };
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [inArray(calls.agentId, assignedAgentIds)];
    
    if (params.agentId) {
      conditions.push(eq(calls.agentId, params.agentId));
    }
    
    if (params.sentiment && params.sentiment.length > 0) {
      conditions.push(inArray(calls.sentiment, params.sentiment as ("positive" | "negative" | "neutral")[]));
    }
    
    if (params.dateFrom) {
      conditions.push(gte(calls.startTime, params.dateFrom));
    }
    
    if (params.dateTo) {
      conditions.push(lte(calls.startTime, params.dateTo));
    }
    
    if (params.durationMin !== undefined) {
      conditions.push(gte(calls.duration, params.durationMin));
    }
    
    if (params.durationMax !== undefined) {
      conditions.push(lte(calls.duration, params.durationMax));
    }
    
    if (params.hasRecording === true) {
      conditions.push(isNotNull(calls.recordingUrl));
    } else if (params.hasRecording === false) {
      conditions.push(isNull(calls.recordingUrl));
    }

    // Get total count
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(and(...conditions));

    // Build order by
    let orderByClause;
    const sortOrder = params.sortOrder === 'asc' ? asc : desc;
    switch (params.sortBy) {
      case 'duration':
        orderByClause = sortOrder(calls.duration);
        break;
      case 'sentiment':
        orderByClause = sortOrder(calls.sentiment);
        break;
      default:
        orderByClause = sortOrder(calls.startTime);
    }

    // Get paginated results
    const results = await db.select().from(calls)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Filter by search query if provided (in-memory for transcript/outcome search)
    let filteredResults = results;
    if (params.q) {
      const query = params.q.toLowerCase();
      filteredResults = results.filter(call => {
        const transcriptText = JSON.stringify(call.transcript || '').toLowerCase();
        const outcomeText = (call.outcome || '').toLowerCase();
        const analysisText = JSON.stringify(call.analysis || '').toLowerCase();
        return transcriptText.includes(query) || 
               outcomeText.includes(query) || 
               analysisText.includes(query);
      });
    }

    const pages = Math.ceil(Number(count) / limit);

    return {
      calls: filteredResults,
      total: Number(count),
      page,
      pageSize: limit,
      pages
    };
  }

  // Search suggestions
  async getSearchSuggestions(userId: string, query: string): Promise<string[]> {
    const allCalls = await this.getAllCalls(userId);
    const suggestions = new Set<string>();
    
    allCalls.forEach(call => {
      if (call.outcome && call.outcome.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(call.outcome);
      }
      
      const analysis = call.analysis as any;
      if (analysis?.topics) {
        analysis.topics.forEach((topic: string) => {
          if (topic.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(topic);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  }

  // Analytics data
  async getAnalyticsData(userId: string, params: {
    dateFrom: Date;
    dateTo: Date;
    compareFrom?: Date;
    compareTo?: Date;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<any> {
    const assignedAgentIds = await this.getAssignedAgentIds(userId);
    if (assignedAgentIds.length === 0) {
      return {
        metrics: {
          totalCalls: 0,
          avgDuration: 0,
          avgSentiment: 0,
          resolutionRate: 0
        },
        trends: [],
        agentPerformance: [],
        peakHours: []
      };
    }

    // Get calls for the main period
    const mainCalls = await db.select().from(calls)
      .where(and(
        inArray(calls.agentId, assignedAgentIds),
        between(calls.startTime, params.dateFrom, params.dateTo)
      ));

    // Calculate main metrics
    const totalCalls = mainCalls.length;
    const avgDuration = totalCalls > 0 
      ? mainCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls 
      : 0;
    
    const sentimentScores = { positive: 1, neutral: 0, negative: -1 };
    const avgSentiment = totalCalls > 0
      ? mainCalls.reduce((sum, c) => sum + (sentimentScores[c.sentiment || 'neutral'] || 0), 0) / totalCalls
      : 0;
    
    const resolutionRate = totalCalls > 0
      ? mainCalls.filter(c => c.outcome === 'Resolved' || c.outcome === 'Sale Closed').length / totalCalls
      : 0;

    // Get comparison metrics if dates provided
    let comparisons;
    if (params.compareFrom && params.compareTo) {
      const compareCalls = await db.select().from(calls)
        .where(and(
          inArray(calls.agentId, assignedAgentIds),
          between(calls.startTime, params.compareFrom, params.compareTo)
        ));
      
      const compareTotalCalls = compareCalls.length;
      const compareAvgDuration = compareTotalCalls > 0 
        ? compareCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / compareTotalCalls 
        : 0;
      
      const compareAvgSentiment = compareTotalCalls > 0
        ? compareCalls.reduce((sum, c) => sum + (sentimentScores[c.sentiment || 'neutral'] || 0), 0) / compareTotalCalls
        : 0;
      
      const compareResolutionRate = compareTotalCalls > 0
        ? compareCalls.filter(c => c.outcome === 'Resolved' || c.outcome === 'Sale Closed').length / compareTotalCalls
        : 0;
      
      comparisons = {
        totalCalls: compareTotalCalls,
        avgDuration: compareAvgDuration,
        avgSentiment: compareAvgSentiment,
        resolutionRate: compareResolutionRate
      };
    }

    // Calculate trends (simplified for database implementation)
    const trends = [];
    const groupBy = params.groupBy || 'day';
    const current = new Date(params.dateFrom);
    
    while (current <= params.dateTo) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);
      
      if (groupBy === 'hour') {
        periodEnd.setHours(periodEnd.getHours() + 1);
      } else if (groupBy === 'day') {
        periodEnd.setDate(periodEnd.getDate() + 1);
      } else if (groupBy === 'week') {
        periodEnd.setDate(periodEnd.getDate() + 7);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      
      const periodCalls = mainCalls.filter(c => 
        new Date(c.startTime) >= periodStart && new Date(c.startTime) < periodEnd
      );
      
      const sentimentCounts = {
        positive: periodCalls.filter(c => c.sentiment === 'positive').length,
        negative: periodCalls.filter(c => c.sentiment === 'negative').length,
        neutral: periodCalls.filter(c => c.sentiment === 'neutral').length
      };
      
      trends.push({
        timestamp: periodStart.toISOString(),
        calls: periodCalls.length,
        avgDuration: periodCalls.length > 0 
          ? periodCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / periodCalls.length 
          : 0,
        sentiment: sentimentCounts
      });
      
      current.setTime(periodEnd.getTime());
    }

    // Get agent performance
    const agentsList = await db.select().from(agents)
      .where(inArray(agents.id, assignedAgentIds));
    
    const agentPerformance = agentsList.map(agent => {
      const agentCalls = mainCalls.filter(c => c.agentId === agent.id);
      const agentTotalCalls = agentCalls.length;
      
      return {
        agentId: agent.id,
        agentName: agent.name,
        totalCalls: agentTotalCalls,
        avgDuration: agentTotalCalls > 0 
          ? agentCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / agentTotalCalls 
          : 0,
        avgSentiment: agentTotalCalls > 0
          ? agentCalls.reduce((sum, c) => sum + (sentimentScores[c.sentiment || 'neutral'] || 0), 0) / agentTotalCalls
          : 0,
        resolutionRate: agentTotalCalls > 0
          ? agentCalls.filter(c => c.outcome === 'Resolved' || c.outcome === 'Sale Closed').length / agentTotalCalls
          : 0
      };
    });

    // Calculate peak hours
    const hourStats = new Map<number, { calls: number; totalWait: number }>();
    for (let hour = 0; hour < 24; hour++) {
      hourStats.set(hour, { calls: 0, totalWait: 0 });
    }
    
    mainCalls.forEach(call => {
      const hour = new Date(call.startTime).getHours();
      const stats = hourStats.get(hour)!;
      stats.calls++;
      stats.totalWait += Math.random() * 30; // Simulated wait time
    });
    
    const peakHours = Array.from(hourStats.entries())
      .map(([hour, stats]) => ({
        hour,
        calls: stats.calls,
        avgWaitTime: stats.calls > 0 ? stats.totalWait / stats.calls : 0
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

  // Import conversations from ElevenLabs
  async importConversationFromElevenLabs(
    agentId: string,
    conversation: any
  ): Promise<Call | undefined> {
    try {
      // Generate a unique call ID based on the conversation ID
      const callId = `EL-${conversation.conversation_id}`;
      
      // Check if this conversation already exists
      const [existingCall] = await db.select().from(calls)
        .where(eq(calls.id, callId));
      
      if (existingCall) {
        console.log(`Conversation ${callId} already imported, skipping`);
        return undefined;
      }

      // Validate and convert timestamps
      let startTime: Date;
      let endTime: Date | undefined;
      let duration = 0;

      // Check if start_time is valid
      if (conversation.start_time) {
        const startTimestamp = Number(conversation.start_time);
        if (!isNaN(startTimestamp) && startTimestamp > 0) {
          // ElevenLabs timestamps are in milliseconds
          startTime = new Date(startTimestamp);
          // Validate the date
          if (isNaN(startTime.getTime())) {
            console.warn(`Invalid start_time for conversation ${conversation.conversation_id}:`, conversation.start_time);
            startTime = new Date(); // Use current time as fallback
          }
        } else {
          console.warn(`Invalid start_time for conversation ${conversation.conversation_id}:`, conversation.start_time);
          startTime = new Date(); // Use current time as fallback
        }
      } else {
        startTime = new Date(); // Use current time if missing
      }

      // Check if end_time is valid
      if (conversation.end_time) {
        const endTimestamp = Number(conversation.end_time);
        if (!isNaN(endTimestamp) && endTimestamp > 0) {
          endTime = new Date(endTimestamp);
          // Validate the date
          if (isNaN(endTime.getTime())) {
            console.warn(`Invalid end_time for conversation ${conversation.conversation_id}:`, conversation.end_time);
            endTime = undefined;
          } else {
            // Calculate duration in seconds
            duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
            if (duration < 0) {
              console.warn(`Negative duration for conversation ${conversation.conversation_id}:`, duration);
              duration = 0;
            }
          }
        } else {
          console.warn(`Invalid end_time for conversation ${conversation.conversation_id}:`, conversation.end_time);
          endTime = undefined;
        }
      }

      // Transform ElevenLabs transcript format to our format
      let formattedTranscript = [];
      if (conversation.transcript && Array.isArray(conversation.transcript)) {
        formattedTranscript = conversation.transcript.map((entry: any, index: number) => {
          // Handle ElevenLabs format with role and message
          if (entry.role && entry.message !== null && entry.message !== undefined) {
            return {
              timestamp: entry.time_in_call_secs ? 
                `${Math.floor(entry.time_in_call_secs / 60).toString().padStart(2, '0')}:${Math.floor(entry.time_in_call_secs % 60).toString().padStart(2, '0')}` : 
                `00:${(index * 5).toString().padStart(2, '0')}`, // Approximate timestamp if not provided
              speaker: entry.role === 'agent' ? 'agent' : 'user',
              text: String(entry.message)
            };
          }
          // If already in correct format, keep it but ensure text is a string
          if (entry.timestamp && entry.speaker && entry.text) {
            // Check if text is actually a JSON object that needs to be extracted
            if (typeof entry.text === 'object' && entry.text !== null) {
              // If it's an object, try to extract the message
              const textObj = entry.text;
              if (textObj.message !== null && textObj.message !== undefined) {
                return {
                  ...entry,
                  text: String(textObj.message)
                };
              } else if (textObj.role && textObj.tool_calls) {
                // This is a tool call, skip it or show a placeholder
                return null; // Will be filtered out
              }
            }
            return {
              ...entry,
              text: String(entry.text)
            };
          }
          // Handle entries with null message (tool calls, etc) - skip them
          if (entry.role && (entry.message === null || entry.message === undefined)) {
            if (entry.tool_calls && entry.tool_calls.length > 0) {
              // Skip tool call entries
              return null;
            }
          }
          // Fallback - if we can't parse it properly, skip it
          return null;
        }).filter(entry => entry !== null); // Remove null entries
      }

      // Prepare the call data - directly insert with custom ID
      const callData = {
        id: callId,
        agentId,
        startTime,
        endTime,
        duration,
        sentiment: conversation.analysis?.sentiment || 'neutral',
        outcome: conversation.metadata?.outcome || 'Completed',
        recordingUrl: conversation.recording_url || conversation.audio_url || null,
        transcript: formattedTranscript,
        analysis: conversation.analysis ? {
          summary: conversation.analysis.summary || '',
          topics: conversation.analysis.topics || [],
        } : undefined,
        metadata: conversation.metadata || {},
      };

      // Insert the call with custom ID
      const [insertedCall] = await db.insert(calls).values(callData).returning();
      
      console.log(`Imported conversation ${callId} successfully`);
      return insertedCall;
    } catch (error) {
      console.error(`Failed to import conversation ${conversation.conversation_id}:`, error);
      return undefined;
    }
  }

  // Bulk import conversations
  async bulkImportConversations(
    agentId: string,
    conversations: any[]
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
    };

    for (const conversation of conversations) {
      try {
        const result = await this.importConversationFromElevenLabs(agentId, conversation);
        if (result) {
          results.imported++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`Failed to import conversation:`, error);
        results.failed++;
      }
    }

    return results;
  }

  // Accounts Management
  async getAccount(accountId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts)
      .where(eq(accounts.id, accountId));
    return account || undefined;
  }

  async getAllAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  async getAccountsByService(service: 'elevenlabs' | 'livekit'): Promise<Account[]> {
    return await db.select().from(accounts)
      .where(eq(accounts.service, service));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts).values(account).returning();
    return created;
  }

  async updateAccount(accountId: string, updates: Partial<Account>): Promise<Account | undefined> {
    const [updated] = await db.update(accounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();
    return updated || undefined;
  }

  async deleteAccount(accountId: string): Promise<boolean> {
    const result = await db.delete(accounts)
      .where(eq(accounts.id, accountId));
    return (result.rowCount ?? 0) > 0;
  }

  // Permissions Management
  async getUserPermissions(userId: string): Promise<Record<string, boolean>> {
    const user = await this.getUser(userId);
    if (!user) return {};
    return (user.permissions as Record<string, boolean>) || {};
  }

  async updateUserPermissions(userId: string, permissions: Record<string, boolean>): Promise<boolean> {
    const result = await db.update(users)
      .set({ permissions })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async checkUserPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Admins have all permissions
    if (user.role === 'admin') return true;
    
    const permissions = (user.permissions as Record<string, boolean>) || {};
    return permissions[permission] === true;
  }

  // Phone Numbers Management
  async getPhoneNumber(phoneNumberId: string): Promise<PhoneNumber | undefined> {
    const [phoneNumber] = await db.select().from(phoneNumbers)
      .where(eq(phoneNumbers.id, phoneNumberId));
    return phoneNumber || undefined;
  }

  async getAllPhoneNumbers(): Promise<PhoneNumber[]> {
    return await db.select().from(phoneNumbers);
  }

  async getPhoneNumbersByAgent(agentId: string): Promise<PhoneNumber[]> {
    return await db.select().from(phoneNumbers)
      .where(eq(phoneNumbers.agentId, agentId));
  }

  async createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const [created] = await db.insert(phoneNumbers).values(phoneNumber).returning();
    return created;
  }

  async updatePhoneNumber(id: string, updates: Partial<PhoneNumber>): Promise<PhoneNumber | undefined> {
    const [updated] = await db.update(phoneNumbers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(phoneNumbers.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePhoneNumber(id: string): Promise<boolean> {
    const result = await db.delete(phoneNumbers)
      .where(eq(phoneNumbers.id, id));
    return !!result;
  }

  // Sync History Management
  async getSyncHistory(agentId: string): Promise<SyncHistory[]> {
    return await db.select().from(syncHistory)
      .where(eq(syncHistory.agentId, agentId))
      .orderBy(desc(syncHistory.startedAt));
  }

  async getLatestSync(agentId: string): Promise<SyncHistory | undefined> {
    const [latest] = await db.select().from(syncHistory)
      .where(eq(syncHistory.agentId, agentId))
      .orderBy(desc(syncHistory.startedAt))
      .limit(1);
    return latest || undefined;
  }

  async createSyncHistory(sync: InsertSyncHistory): Promise<SyncHistory> {
    const [created] = await db.insert(syncHistory).values(sync).returning();
    return created;
  }

  async updateSyncHistory(id: string, updates: Partial<SyncHistory>): Promise<SyncHistory | undefined> {
    const [updated] = await db.update(syncHistory)
      .set(updates)
      .where(eq(syncHistory.id, id))
      .returning();
    return updated || undefined;
  }

  // Playground Sessions Management
  async getPlaygroundSession(sessionId: string): Promise<PlaygroundSession | undefined> {
    const [session] = await db.select().from(playgroundSessions)
      .where(eq(playgroundSessions.id, sessionId));
    return session || undefined;
  }

  async getPlaygroundSessionsByUser(userId: string): Promise<PlaygroundSession[]> {
    return await db.select().from(playgroundSessions)
      .where(eq(playgroundSessions.userId, userId))
      .orderBy(desc(playgroundSessions.createdAt));
  }

  async getPlaygroundSessionsByAgent(agentId: string): Promise<PlaygroundSession[]> {
    return await db.select().from(playgroundSessions)
      .where(eq(playgroundSessions.agentId, agentId))
      .orderBy(desc(playgroundSessions.createdAt));
  }

  async createPlaygroundSession(session: InsertPlaygroundSession): Promise<PlaygroundSession> {
    const [created] = await db.insert(playgroundSessions).values(session).returning();
    return created;
  }

  async updatePlaygroundSession(id: string, updates: Partial<PlaygroundSession>): Promise<PlaygroundSession | undefined> {
    const [updated] = await db.update(playgroundSessions)
      .set(updates)
      .where(eq(playgroundSessions.id, id))
      .returning();
    return updated || undefined;
  }

  // Advanced Sync Operations
  async syncAgent(agentId: string, userId: string): Promise<{
    conversations: number;
    transcripts: number;
    analytics: number;
    errors: string[];
  }> {
    // This would integrate with ElevenLabs API to sync all data
    // For now, returning placeholder implementation
    return {
      conversations: 0,
      transcripts: 0,
      analytics: 0,
      errors: []
    };
  }
}

// Export the DatabaseStorage instance instead of MemStorage
export const storage = new DatabaseStorage();