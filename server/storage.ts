import { 
  type User, type InsertUser,
  type Agent, type InsertAgent,
  type Call, type InsertCall,
  type PerformanceMetric, type InsertPerformanceMetric,
  type LiveKitRoom, type InsertLiveKitRoom
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Agents
  getAgent(id: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;

  // Calls
  getCall(id: string): Promise<Call | undefined>;
  getAllCalls(): Promise<Call[]>;
  getCallsByAgent(agentId: string): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined>;

  // Performance Metrics
  getPerformanceMetric(id: string): Promise<PerformanceMetric | undefined>;
  getPerformanceMetricsByCall(callId: string): Promise<PerformanceMetric[]>;
  getPerformanceMetricsByAgent(agentId: string): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;

  // LiveKit Rooms
  getLiveKitRoom(id: string): Promise<LiveKitRoom | undefined>;
  getAllLiveKitRooms(): Promise<LiveKitRoom[]>;
  createLiveKitRoom(room: InsertLiveKitRoom): Promise<LiveKitRoom>;
  updateLiveKitRoom(id: string, updates: Partial<LiveKitRoom>): Promise<LiveKitRoom | undefined>;

  // Dashboard data
  getDashboardStats(): Promise<{
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

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed users
    const users = [
      {
        id: randomUUID(),
        username: "alice.johnson",
        email: "alice@company.com",
        password: "hashedPassword",
        role: "admin" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        username: "bob.smith",
        email: "bob@company.com",
        password: "hashedPassword",
        role: "analyst" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        username: "sarah.connors",
        email: "sarah@company.com",
        password: "hashedPassword",
        role: "supervisor" as const,
        isActive: true,
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
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
    ];

    agents.forEach(agent => this.agents.set(agent.id, agent));

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
    const salesBotId = Array.from(this.agents.values()).find(a => a.name === "SalesBot")?.id!;
    const supportRouterId = Array.from(this.agents.values()).find(a => a.name === "SupportRouter")?.id!;

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
      role: insertUser.role || "viewer",
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

  // Agent methods
  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
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

  // Call methods
  async getCall(id: string): Promise<Call | undefined> {
    return this.calls.get(id);
  }

  async getAllCalls(): Promise<Call[]> {
    return Array.from(this.calls.values());
  }

  async getCallsByAgent(agentId: string): Promise<Call[]> {
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

  // Performance metric methods
  async getPerformanceMetric(id: string): Promise<PerformanceMetric | undefined> {
    return this.performanceMetrics.get(id);
  }

  async getPerformanceMetricsByCall(callId: string): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values()).filter(metric => metric.callId === callId);
  }

  async getPerformanceMetricsByAgent(agentId: string): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values()).filter(metric => metric.agentId === agentId);
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

  // LiveKit room methods
  async getLiveKitRoom(id: string): Promise<LiveKitRoom | undefined> {
    return this.liveKitRooms.get(id);
  }

  async getAllLiveKitRooms(): Promise<LiveKitRoom[]> {
    return Array.from(this.liveKitRooms.values());
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

  // Dashboard methods
  async getDashboardStats() {
    const calls = Array.from(this.calls.values());
    const activeRooms = Array.from(this.liveKitRooms.values()).filter(room => room.isActive);
    const metrics = Array.from(this.performanceMetrics.values());

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

    // Generate mock call volume data for the last 7 days
    const callVolumeData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        elevenlabs: Math.floor(Math.random() * 50) + 20,
        livekit: Math.floor(Math.random() * 30) + 15,
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
