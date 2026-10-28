import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

const uploadsDir = path.resolve(process.cwd(), "data", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const Route = createFileRoute("/api/track-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData().catch(() => null);
          if (!form) return new Response("Invalid form data", { status: 400 });

          const file = form.get("file");
          if (!(file instanceof File)) return new Response("Missing file", { status: 400 });

          const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "upload";
          const relativePath = `${Date.now()}-${safeName}`;
          const diskPath = path.join(uploadsDir, relativePath);

          const buffer = Buffer.from(await file.arrayBuffer());
          await fs.promises.writeFile(diskPath, buffer);

          const { db } = await import("@/db");
          const { visitorEvents } = await import("@/db/schema");

          await db.insert(visitorEvents).values({
            id: crypto.randomUUID(),
            sessionId: "local-session",
            eventType: "upload",
            channel: "file",
            fileName: file.name.slice(0, 300),
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            filePath: relativePath,
            createdAt: Date.now(),
          });

          return Response.json({ path: relativePath });
        } catch (err) {
          console.error("Local file upload error:", err);
          return new Response("Upload failed", { status: 500 });
        }
      },
    },
  },
});
