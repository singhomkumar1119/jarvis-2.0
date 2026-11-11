import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const rawDbUrl = (process.env.DATABASE_URL || "").trim();
export const isPostgresDb =
  rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clientInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;

if (isPostgresDb) {
  const pool = new pg.Pool({
    connectionString: rawDbUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
  clientInstance = pool;
  dbInstance = drizzlePg(pool, {
    schema: {
      chatHistory: schema.pgChatHistory,
      visitorEvents: schema.pgVisitorEvents,
      tasks: schema.pgTasks,
      userSettings: schema.pgUserSettings,
    },
  });
} else {
  const sqliteUrl = rawDbUrl || `file:${path.join(dataDir, "jarvis.db")}`;
  const client = createClient({
    url: sqliteUrl,
  });
  clientInstance = client;
  dbInstance = drizzleLibsql(client, {
    schema: {
      chatHistory: schema.sqliteChatHistory,
      visitorEvents: schema.sqliteVisitorEvents,
      tasks: schema.sqliteTasks,
      userSettings: schema.sqliteUserSettings,
    },
  });
}

export const client = clientInstance;
export const db = dbInstance;

let initialized = false;
export async function ensureDbReady() {
  if (initialized) return;
  try {
    if (isPostgresDb) {
      await clientInstance.query(`
        CREATE TABLE IF NOT EXISTS public.chat_history (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'owner',
          channel TEXT DEFAULT 'chat',
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          model TEXT,
          created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.visitor_events (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          event_type TEXT DEFAULT 'visit',
          channel TEXT,
          content TEXT,
          file_name TEXT,
          file_type TEXT,
          file_size BIGINT,
          file_path TEXT,
          created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          detail TEXT DEFAULT '',
          progress INTEGER DEFAULT 0,
          state TEXT DEFAULT 'queued',
          created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS public.user_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log("✓ Connected to Supabase PostgreSQL database.");
    } else {
      await clientInstance.execute(`
        CREATE TABLE IF NOT EXISTS chat_history (
          id TEXT PRIMARY KEY,
          user_id TEXT DEFAULT 'owner',
          channel TEXT DEFAULT 'chat',
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          model TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS visitor_events (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          event_type TEXT DEFAULT 'visit',
          channel TEXT,
          content TEXT,
          file_name TEXT,
          file_type TEXT,
          file_size INTEGER,
          file_path TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          detail TEXT DEFAULT '',
          progress INTEGER DEFAULT 0,
          state TEXT DEFAULT 'queued',
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      console.log("✓ Connected to local SQLite database (./data/jarvis.db).");
    }
    initialized = true;
  } catch (err) {
    console.error("Failed to initialize database schema:", err);
  }
}

// Trigger initial check
void ensureDbReady();
