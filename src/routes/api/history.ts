import { createFileRoute } from "@tanstack/react-router";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { chatHistory } from "@/db/schema";

export const Route = createFileRoute("/api/history")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const rows = await db
            .select()
            .from(chatHistory)
            .orderBy(desc(chatHistory.createdAt))
            .limit(200);

          return Response.json({
            history: rows.map((r) => ({
              id: r.id,
              question: r.question,
              answer: r.answer,
              model: r.model,
              created_at: r.createdAt,
            })),
          });
        } catch (err) {
          console.error("Failed to fetch history:", err);
          return Response.json({ history: [] });
        }
      },
      DELETE: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");

          if (id) {
            await db.delete(chatHistory).where(eq(chatHistory.id, id));
          } else {
            await db.delete(chatHistory);
          }

          return Response.json({ ok: true });
        } catch (err) {
          console.error("Failed to delete history:", err);
          return new Response("Failed to delete", { status: 500 });
        }
      },
    },
  },
});
