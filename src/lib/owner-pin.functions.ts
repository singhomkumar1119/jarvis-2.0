import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { visitorEvents } from "@/db/schema";
import type { VisitorEvent } from "@/lib/admin.functions";

export const unlockWithPin = createServerFn({ method: "POST" })
  .validator((input: { pin?: string } | undefined) => ({
    pin: String(input?.pin ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    const secret = process.env["JARVIS_PIN"] || process.env["OWNER_PIN"];
    if (!secret) return { token: "owner-authorized" };
    if (data.pin !== secret) throw new Error("Wrong PIN");
    return { token: "owner-authorized" };
  });

export const listVisitorEventsWithPin = createServerFn({ method: "POST" })
  .validator((input: { token?: string; limit?: number } | undefined) => ({
    token: String(input?.token ?? "").slice(0, 200),
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
