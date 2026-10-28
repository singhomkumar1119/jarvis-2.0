import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const loginSchema = z.object({
  pin: z.string().optional(),
});

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requiredPin = process.env["JARVIS_PIN"]?.trim();
        // If no PIN is configured, always unlocked
        if (!requiredPin) {
          return Response.json({ required: false, authenticated: true });
        }

        const cookieHeader = request.headers.get("cookie") ?? "";
        const authenticated = cookieHeader.includes(`jarvis_session=${requiredPin}`);
        return Response.json({ required: true, authenticated });
      },
      POST: async ({ request }) => {
        const requiredPin = process.env["JARVIS_PIN"]?.trim();

        // If no PIN is configured, instant success
        if (!requiredPin) {
          return Response.json({ ok: true });
        }

        const body = loginSchema.safeParse(await request.json().catch(() => ({})));
        if (!body.success) {
          return new Response("Invalid request", { status: 400 });
        }

        const enteredPin = body.data.pin?.trim();
        if (enteredPin === requiredPin) {
          const headers = new Headers();
          headers.append(
            "Set-Cookie",
            `jarvis_session=${requiredPin}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`, // 30 days
          );
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers,
          });
        }

        return new Response("Incorrect PIN", { status: 401 });
      },
      DELETE: async () => {
        const headers = new Headers();
        headers.append("Set-Cookie", "jarvis_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
