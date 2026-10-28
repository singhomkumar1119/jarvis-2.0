import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { visitorEvents } from "@/db/schema";

export type VisitorEvent = {
  id: string;
  session_id: string;
  event_type: string;
  channel: string | null;
  content: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  screen: string | null;
  language: string | null;
  page_path: string | null;
  created_at: string;
  file_url?: string | null;
};

export const isAdmin = createServerFn({ method: "GET" }).handler(async () => {
  return { admin: true };
});

export const listVisitorEvents = createServerFn({ method: "POST" })
  .validator((input: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(input?.limit ?? 200, 1), 500),
  }))
  .handler(async ({ data }): Promise<{ events: VisitorEvent[] }> => {
    try {
      const rows = await db
        .select()
        .from(visitorEvents)
        .orderBy(desc(visitorEvents.createdAt))
        .limit(data.limit);

      const events: VisitorEvent[] = rows.map((r) => ({
        id: r.id,
        session_id: r.sessionId || "local",
        event_type: r.eventType || "visit",
        channel: r.channel,
        content: r.content,
        file_name: r.fileName,
        file_type: r.fileType,
        file_size: r.fileSize,
        file_path: r.filePath,
        ip_address: "127.0.0.1",
        user_agent: null,
        device: null,
        browser: null,
        os: null,
        screen: null,
        language: null,
        page_path: null,
        created_at: new Date(r.createdAt).toISOString(),
        file_url: r.filePath ? `/data/uploads/${r.filePath}` : null,
      }));

      return { events };
    } catch {
      return { events: [] };
    }
  });
