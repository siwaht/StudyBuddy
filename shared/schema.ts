import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { enum: ["admin", "user"] }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active"),
  permissions: jsonb("permissions").default('{}'), // JSON object for fine-grained permissions
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  platform: varchar("platform", { enum: ["elevenlabs", "livekit"] }).notNull(),
  accountId: varchar("account_id"), // Reference to the account this agent belongs to
  externalId: text("external_id"), // Platform-specific agent ID
  description: text("description"),
  metadata: jsonb("metadata"), // Store platform-specific metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    accountIdIdx: index("agents_account_id_idx").on(table.accountId),
    isActiveIdx: index("agents_is_active_idx").on(table.isActive),
    platformIdx: index("agents_platform_idx").on(table.platform),
  };
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  sentiment: varchar("sentiment", { enum: ["positive", "negative", "neutral"] }),
  outcome: text("outcome"),
  recordingUrl: text("recording_url"),
  transcript: jsonb("transcript"), // array of transcript entries
  analysis: jsonb("analysis"), // AI analysis data
  metadata: jsonb("metadata"), // platform-specific metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    agentIdIdx: index("calls_agent_id_idx").on(table.agentId),
    startTimeIdx: index("calls_start_time_idx").on(table.startTime),
    createdAtIdx: index("calls_created_at_idx").on(table.createdAt),
    sentimentIdx: index("calls_sentiment_idx").on(table.sentiment),
  };
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id).notNull(),
  callId: varchar("call_id").references(() => calls.id).notNull(),
  speechToTextLatency: integer("stt_latency"), // in milliseconds
  elevenLabsLatency: integer("elevenlabs_latency"),
  liveKitLatency: integer("livekit_latency"),
  totalLatency: integer("total_latency"),
  responseTime: integer("response_time"),
  audioQuality: decimal("audio_quality", { precision: 3, scale: 2 }),
  successRate: decimal("success_rate", { precision: 5, scale: 4 }),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
}, (table) => {
  return {
    agentIdIdx: index("performance_metrics_agent_id_idx").on(table.agentId),
    callIdIdx: index("performance_metrics_call_id_idx").on(table.callId),
    timestampIdx: index("performance_metrics_timestamp_idx").on(table.timestamp),
  };
});

export const liveKitRooms = pgTable("livekit_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: text("room_id").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  participantCount: integer("participant_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// User-Agent assignments for multi-tenant access control
export const userAgents = pgTable("user_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  agentId: varchar("agent_id").references(() => agents.id).notNull(),
  assignedAt: timestamp("assigned_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    uniqueUserAgent: sql`UNIQUE(user_id, agent_id)`,
    userIdIdx: index("user_agents_user_id_idx").on(table.userId),
    agentIdIdx: index("user_agents_agent_id_idx").on(table.agentId),
  };
});

// Phone numbers management
export const phoneNumbers = pgTable("phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: varchar("number").notNull(),
  provider: varchar("provider", { enum: ["twilio", "sip"] }).notNull(),
  accountId: varchar("account_id"),
  agentId: varchar("agent_id").references(() => agents.id),
  configuration: jsonb("configuration"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Sync history for tracking synchronization operations
export const syncHistory = pgTable("sync_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id).notNull(),
  syncType: varchar("sync_type", { enum: ["full", "incremental"] }).notNull(),
  itemsSynced: integer("items_synced").notNull().default(0),
  status: varchar("status", { enum: ["pending", "in_progress", "completed", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    agentIdIdx: index("sync_history_agent_id_idx").on(table.agentId),
    statusIdx: index("sync_history_status_idx").on(table.status),
  };
});

// Playground sessions for testing agents
export const playgroundSessions = pgTable("playground_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id"), // ElevenLabs session ID
  duration: integer("duration"), // in seconds
  transcript: jsonb("transcript"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Accounts for external service integrations (supports multiple accounts per service)
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // User-friendly label like "Production ElevenLabs"
  service: varchar("service", { enum: ["elevenlabs", "livekit"] }).notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSynced: timestamp("last_synced"), // When we last synced data from this account
  metadata: jsonb("metadata"), // Account-specific info like workspace name
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (table) => {
  return {
    serviceIdx: index("accounts_service_idx").on(table.service),
    isActiveIdx: index("accounts_is_active_idx").on(table.isActive),
  };
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export const selectAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.enum(["elevenlabs", "livekit"]),
  accountId: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  metadata: z.any().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertLiveKitRoomSchema = createInsertSchema(liveKitRooms).omit({
  id: true,
  createdAt: true,
});

export const insertUserAgentSchema = createInsertSchema(userAgents).omit({
  id: true,
  assignedAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSyncHistorySchema = createInsertSchema(syncHistory).omit({
  id: true,
  startedAt: true,
});

export const insertPlaygroundSessionSchema = createInsertSchema(playgroundSessions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

export type LiveKitRoom = typeof liveKitRooms.$inferSelect;
export type InsertLiveKitRoom = z.infer<typeof insertLiveKitRoomSchema>;

export type UserAgent = typeof userAgents.$inferSelect;
export type InsertUserAgent = z.infer<typeof insertUserAgentSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;

export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = z.infer<typeof insertSyncHistorySchema>;

export type PlaygroundSession = typeof playgroundSessions.$inferSelect;
export type InsertPlaygroundSession = z.infer<typeof insertPlaygroundSessionSchema>;
