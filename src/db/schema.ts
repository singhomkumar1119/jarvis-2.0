import { sqliteTable, text as sqText, integer as sqInteger } from "drizzle-orm/sqlite-core";
import { pgTable, text as pgText, bigint as pgBigint, integer as pgInteger } from "drizzle-orm/pg-core";

export const isPostgres = () => {
  const url = process.env.DATABASE_URL || "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
};

// ==========================================
// SQLite Schema (Local Default)
// ==========================================
export const sqliteChatHistory = sqliteTable("chat_history", {
  id: sqText("id").primaryKey(),
  userId: sqText("user_id").default("owner"),
  channel: sqText("channel").default("chat"),
  question: sqText("question").notNull(),
  answer: sqText("answer").notNull(),
  model: sqText("model"),
  createdAt: sqInteger("created_at").notNull(),
});

export const sqliteVisitorEvents = sqliteTable("visitor_events", {
  id: sqText("id").primaryKey(),
  sessionId: sqText("session_id"),
  eventType: sqText("event_type").default("visit"),
  channel: sqText("channel"),
  content: sqText("content"),
  fileName: sqText("file_name"),
  fileType: sqText("file_type"),
  fileSize: sqInteger("file_size"),
  filePath: sqText("file_path"),
  createdAt: sqInteger("created_at").notNull(),
});

export const sqliteTasks = sqliteTable("tasks", {
  id: sqText("id").primaryKey(),
  title: sqText("title").notNull(),
  detail: sqText("detail").default(""),
  progress: sqInteger("progress").default(0),
  state: sqText("state").default("queued"),
  createdAt: sqInteger("created_at").notNull(),
});

export const sqliteUserSettings = sqliteTable("user_settings", {
  key: sqText("key").primaryKey(),
  value: sqText("value").notNull(),
});

// ==========================================
// PostgreSQL Schema (Supabase)
// ==========================================
export const pgChatHistory = pgTable("chat_history", {
  id: pgText("id").primaryKey(),
  userId: pgText("user_id").default("owner"),
  channel: pgText("channel").default("chat"),
  question: pgText("question").notNull(),
  answer: pgText("answer").notNull(),
  model: pgText("model"),
  createdAt: pgBigint("created_at", { mode: "number" }).notNull(),
});

export const pgVisitorEvents = pgTable("visitor_events", {
  id: pgText("id").primaryKey(),
  sessionId: pgText("session_id"),
  eventType: pgText("event_type").default("visit"),
  channel: pgText("channel"),
  content: pgText("content"),
  fileName: pgText("file_name"),
  fileType: pgText("file_type"),
  fileSize: pgBigint("file_size", { mode: "number" }),
  filePath: pgText("file_path"),
  createdAt: pgBigint("created_at", { mode: "number" }).notNull(),
});

export const pgTasks = pgTable("tasks", {
  id: pgText("id").primaryKey(),
  title: pgText("title").notNull(),
  detail: pgText("detail").default(""),
  progress: pgInteger("progress").default(0),
  state: pgText("state").default("queued"),
  createdAt: pgBigint("created_at", { mode: "number" }).notNull(),
});

export const pgUserSettings = pgTable("user_settings", {
  key: pgText("key").primaryKey(),
  value: pgText("value").notNull(),
});

// ==========================================
// Dynamic Unified Export for Application
// ==========================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chatHistory: any = isPostgres() ? pgChatHistory : sqliteChatHistory;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const visitorEvents: any = isPostgres() ? pgVisitorEvents : sqliteVisitorEvents;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tasks: any = isPostgres() ? pgTasks : sqliteTasks;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const userSettings: any = isPostgres() ? pgUserSettings : sqliteUserSettings;
