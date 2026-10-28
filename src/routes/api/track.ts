import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  sessionId: z.string().min(1).max(120),
  eventType: z.enum(["visit", "message", "upload"]),
  channel: z.string().max(40).optional(),
  content: z.string().max(8000).optional(),
  fileName: z.string().max(300).optional(),
  fileType: z.string().max(160).optional(),
  fileSize: z.number().nonnegative().optional(),
  filePath: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = schema.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return new Response("Invalid payload", { status: 400 });
          const d = parsed.data;

          const { db } = await import("@/db");
          const { visitorEvents } = await import("@/db/schema");

          await db.insert(visitorEvents).values({
            id: crypto.randomUUID(),
            sessionId: d.sessionId,
            eventType: d.eventType,
            channel: d.channel ?? null,
            content: d.content ?? null,
            fileName: d.fileName ?? null,
            fileType: d.fileType ?? null,
            fileSize: d.fileSize ?? null,
            filePath: d.filePath ?? null,
            createdAt: Date.now(),
          });

          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: true }); // non-blocking for client telemetry
        }
      },
    },
  },
});
