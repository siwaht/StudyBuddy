import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { enum: ["admin", "supervisor", "analyst", "viewer"] }).notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  platform: varchar("platform", { enum: ["elevenlabs", "livekit"] }).notNull(),
  description: text("description"),
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
