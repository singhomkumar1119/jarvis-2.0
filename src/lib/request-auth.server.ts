/**
 * Self-hosted authentication verification.
 * Supports Personal / PIN mode without external cloud dependencies.
 */

export async function getRequestUserId(request: Request): Promise<string | null> {
  const pin = process.env["JARVIS_PIN"]?.trim();

  // If no PIN is configured, allow instant personal access
  if (!pin) {
    return "owner";
  }

  // Check Authorization header or Cookie
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const cookieHeader = request.headers.get("cookie") ?? "";

  const hasCookie = cookieHeader.includes(`jarvis_session=${pin}`);

  if (token === pin || hasCookie) {
    return "owner";
  }

  return null;
}

export function unauthorized(message = "Please sign in to use Jarvis."): Response {
  return new Response(message, { status: 401 });
}
