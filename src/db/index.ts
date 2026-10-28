import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbUrl = process.env.DATABASE_URL || `file:${path.join(dataDir, "jarvis.db")}`;

export const client = createClient({
  url: dbUrl,
});

export const db = drizzle(client, { schema });

// Auto-initialize schema on first boot
let initialized = false;
export async function ensureDbReady() {
  if (initialized) return;
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'owner',
        channel TEXT DEFAULT 'chat',
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        model TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
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
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        detail TEXT DEFAULT '',
        progress INTEGER DEFAULT 0,
        state TEXT DEFAULT 'queued',
        created_at INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    initialized = true;
  } catch (err) {
    console.error("Failed to auto-initialize SQLite schema:", err);
  }
}

// Trigger initial check
void ensureDbReady();
