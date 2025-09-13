import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
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
  externalId: text("external_id"), // Platform-specific agent ID
  description: text("description"),
  metadata: jsonb("metadata"), // Store platform-specific metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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
  };
});

// API Keys for external service integrations
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service", { enum: ["elevenlabs", "livekit", "openai"] }).notNull().unique(),
  encryptedKey: text("encrypted_key").notNull(),
  lastUsed: timestamp("last_used"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
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

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
