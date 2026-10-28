import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const chatHistory = sqliteTable("chat_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").default("owner"),
  channel: text("channel").default("chat"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  model: text("model"),
  createdAt: integer("created_at").notNull(),
});

export const visitorEvents = sqliteTable("visitor_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  eventType: text("event_type").default("visit"),
  channel: text("channel"),
  content: text("content"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  filePath: text("file_path"),
  createdAt: integer("created_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  detail: text("detail").default(""),
  progress: integer("progress").default(0),
  state: text("state").default("queued"),
  createdAt: integer("created_at").notNull(),
});

export const userSettings = sqliteTable("user_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
