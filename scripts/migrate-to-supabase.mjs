import { createClient } from "@libsql/client";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const targetUrl =
  process.argv[2] ||
  process.env.SUPABASE_DATABASE_URL ||
  (process.env.DATABASE_URL?.startsWith("postgres") ? process.env.DATABASE_URL : null);

if (!targetUrl) {
  console.error("\n❌ Error: No Supabase PostgreSQL connection string provided.");
  console.log("\nUsage:");
  console.log('  npm run db:migrate-supabase "postgresql://postgres.[ref]:[pass]@[host]:6543/postgres"');
  console.log("  OR set SUPABASE_DATABASE_URL in your .env file.\n");
  process.exit(1);
}

const localDbPath = path.resolve(process.cwd(), "data", "jarvis.db");
if (!fs.existsSync(localDbPath)) {
  console.log(`ℹ️ No local SQLite database found at ${localDbPath}. Nothing to migrate.`);
  process.exit(0);
}

console.log("\n========================================================");
console.log("🚀 Starting Jarvis Data Migration: SQLite -> Supabase");
console.log("========================================================\n");

async function migrate() {
  const sqliteClient = createClient({ url: `file:${localDbPath}` });
  const pgPool = new pg.Pool({
    connectionString: targetUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Migrate Chat History
    console.log("📦 1. Migrating chat_history...");
    const chats = await sqliteClient.execute("SELECT * FROM chat_history");
    let chatCount = 0;
    for (const row of chats.rows) {
      await pgPool.query(
        `INSERT INTO public.chat_history (id, user_id, channel, question, answer, model, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           answer = EXCLUDED.answer,
           model = EXCLUDED.model`,
        [row.id, row.user_id, row.channel, row.question, row.answer, row.model, row.created_at]
      );
      chatCount++;
    }
    console.log(`   ✓ Migrated ${chatCount} chat messages.`);

    // 2. Migrate Tasks
    console.log("📦 2. Migrating tasks...");
    const tasks = await sqliteClient.execute("SELECT * FROM tasks");
    let taskCount = 0;
    for (const row of tasks.rows) {
      await pgPool.query(
        `INSERT INTO public.tasks (id, title, detail, progress, state, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           detail = EXCLUDED.detail,
           progress = EXCLUDED.progress,
           state = EXCLUDED.state`,
        [row.id, row.title, row.detail, row.progress, row.state, row.created_at]
      );
      taskCount++;
    }
    console.log(`   ✓ Migrated ${taskCount} tasks.`);

    // 3. Migrate Visitor Events
    console.log("📦 3. Migrating visitor_events...");
    const events = await sqliteClient.execute("SELECT * FROM visitor_events");
    let eventCount = 0;
    for (const row of events.rows) {
      await pgPool.query(
        `INSERT INTO public.visitor_events (id, session_id, event_type, channel, content, file_name, file_type, file_size, file_path, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.session_id,
          row.event_type,
          row.channel,
          row.content,
          row.file_name,
          row.file_type,
          row.file_size,
          row.file_path,
          row.created_at,
        ]
      );
      eventCount++;
    }
    console.log(`   ✓ Migrated ${eventCount} events.`);

    // 4. Migrate User Settings
    console.log("📦 4. Migrating user_settings...");
    const settings = await sqliteClient.execute("SELECT * FROM user_settings");
    let settingCount = 0;
    for (const row of settings.rows) {
      await pgPool.query(
        `INSERT INTO public.user_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [row.key, row.value]
      );
      settingCount++;
    }
    console.log(`   ✓ Migrated ${settingCount} settings.`);

    console.log("\n========================================================");
    console.log("✨ Migration to Supabase Completed Successfully!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
  } finally {
    await pgPool.end();
  }
}

migrate();

