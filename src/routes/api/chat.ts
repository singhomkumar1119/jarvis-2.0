import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { z } from "zod";
import {
  createGeminiProvider,
  createOpenAIProvider,
  createOllamaProvider,
  createNvidiaProvider,
  createCustomProvider,
} from "@/lib/ai-providers.server";

// --- Abuse guard -----------------------------------------------------------
const MAX_MESSAGE_CHARS = 16_000;
const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 60_000;

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(MAX_MESSAGE_CHARS),
        attachments: z
          .array(
            z.object({
              name: z.string().max(300),
              mediaType: z.string().max(120),
              dataUrl: z.string().max(12_000_000),
            }),
          )
          .max(6)
          .optional(),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES),
  channel: z.enum(["chat", "terminal"]).optional(),
  personality: z.string().max(32).optional(),
  model: z.string().max(120).optional(),
});

const PERSONALITY: Record<string, string> = {
  concise: "Answer in as few words as possible. No filler, no preamble.",
  balanced: "Answer clearly and warmly, with just enough detail to be useful.",
  playful: "Answer with wit and a light, charming tone, while still being accurate.",
  technical: "Answer with precise technical depth, naming exact tools, commands and trade-offs.",
};

function systemPrompt(channel: "chat" | "terminal", personality: string) {
  const tone = PERSONALITY[personality] ?? PERSONALITY["balanced"]!;
  const base = `You are Jarvis, a calm, capable personal AI assistant with a cinematic, futuristic presence. ${tone} Never mention which AI model or vendor powers you.`;
  if (channel === "terminal") {
    return `${base}\nYou are answering in a developer terminal. Be command-oriented: give the exact command or code first inside a fenced code block with a language tag, then at most two short lines of explanation.`;
  }
  return `${base}\nKeep replies conversational and suitable to be read aloud: short paragraphs, no markdown tables, no long bullet lists. Use fenced code blocks only when the user asks for code.`;
}

function resolveModel(requestedModel?: string) {
  const geminiKey = process.env["GEMINI_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];
  const ollamaUrl = process.env["OLLAMA_BASE_URL"];
  const nvidiaKey = process.env["NVIDIA_API_KEY"];
  const customUrl = process.env["AI_BASE_URL"];

  const modelId = requestedModel?.trim();

  // 1. If explicit Gemini model or Gemini key is set and no other explicit prefix
  if (modelId?.startsWith("gemini") || (geminiKey && (!modelId || !modelId.includes("/")))) {
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not configured in .env");
    const activeId = modelId || "gemini-2.5-flash";
    const provider = createGeminiProvider(geminiKey);
    return { model: provider(activeId), modelId: activeId };
  }

  // 2. OpenAI models
  if (modelId?.startsWith("gpt-") || openaiKey) {
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured in .env");
    const activeId = modelId || "gpt-4o";
    const provider = createOpenAIProvider(openaiKey);
    return { model: provider(activeId), modelId: activeId };
  }

  // 3. Ollama local
  if (ollamaUrl || modelId?.startsWith("ollama")) {
    const activeId = modelId?.replace("ollama/", "") || "llama3.2";
    const provider = createOllamaProvider(ollamaUrl);
    return { model: provider(activeId), modelId: activeId };
  }

  // 4. Custom endpoint
  if (customUrl) {
    const activeId = modelId || process.env["AI_MODEL"] || "custom-model";
    const provider = createCustomProvider(customUrl, process.env["AI_API_KEY"]);
    return { model: provider(activeId), modelId: activeId };
  }

  // 5. Nvidia
  if (nvidiaKey) {
    const activeId = modelId || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
    const provider = createNvidiaProvider(nvidiaKey);
    return { model: provider(activeId), modelId: activeId };
  }

  // Default fallback instructions
  throw new Error(
    "No AI provider configured. Please add GEMINI_API_KEY to your .env file (free at https://aistudio.google.com/)."
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getRequestUserId, unauthorized } = await import("@/lib/request-auth.server");
        const userId = await getRequestUserId(request);
        if (!userId) {
          return unauthorized("Access denied. Please provide your PIN or unlock Jarvis.");
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid request body.", { status: 400 });
        }

        const parsed = chatBodySchema.safeParse(raw);
        if (!parsed.success) {
          return new Response("Invalid or oversized chat request.", { status: 400 });
        }
        const body = parsed.data;
        const messages = body.messages;

        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        if (totalChars > MAX_TOTAL_CHARS) {
          return new Response("Conversation is too long for a single request.", { status: 413 });
        }

        let selectedModelInstance;
        let selectedModelId = "gemini-2.5-flash";
        try {
          const resolved = resolveModel(body.model);
          selectedModelInstance = resolved.model;
          selectedModelId = resolved.modelId;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI model configuration error.";
          return new Response(msg, { status: 500 });
        }

        const channel = body.channel === "terminal" ? "terminal" : "chat";
        const personality = body.personality ?? "balanced";

        const decodeText = (dataUrl: string) => {
          try {
            const base64 = dataUrl.split(",")[1] ?? "";
            const text = atob(base64);
            return text.slice(0, 20_000);
          } catch {
            return "";
          }
        };

        const buildContent = (m: (typeof messages)[number]) => {
          const files = m.attachments ?? [];
          if (!files.length) return m.content;
          const parts: Array<Record<string, unknown>> = [];
          if (m.content.trim()) parts.push({ type: "text", text: m.content });
          for (const f of files) {
            if (f.mediaType.startsWith("image/")) {
              parts.push({ type: "image", image: f.dataUrl });
            } else if (f.mediaType === "application/pdf") {
              parts.push({ type: "file", data: f.dataUrl, mediaType: f.mediaType });
            } else if (/^text\/|json|xml|csv|javascript|typescript/.test(f.mediaType) || !f.mediaType) {
              const text = decodeText(f.dataUrl);
              parts.push({ type: "text", text: `Attached file "${f.name}":\n\n${text}` });
            } else {
              parts.push({
                type: "text",
                text: `Attached "${f.name}" (${f.mediaType}).`,
              });
            }
          }
          return parts;
        };

        const modelMessages: ModelMessage[] = [
          ...messages
            .filter((m) => m.content.trim().length > 0 || (m.attachments?.length ?? 0) > 0)
            .slice(-25)
            .map((m) =>
              m.role === "assistant"
                ? ({
                    role: "assistant",
                    content: m.content,
                  } as ModelMessage)
                : ({ role: "user", content: buildContent(m) } as ModelMessage),
            ),
        ];

        try {
          const result = streamText({
            model: selectedModelInstance,
            system: systemPrompt(channel, personality),
            messages: modelMessages,
          });

          const encoder = new TextEncoder();
          let answerText = "";

          const stream = new ReadableStream({
            async start(controller) {
              const enqueue = (chunk: string) => {
                answerText += chunk;
                controller.enqueue(encoder.encode(chunk));
              };

              try {
                for await (const chunk of result.textStream) {
                  enqueue(chunk);
                }
              } catch (error) {
                console.error("Stream generation error:", error);
                const errMsg = error instanceof Error ? error.message : "Error streaming response";
                enqueue(`\n\n[Jarvis Error: ${errMsg}]`);
              } finally {
                controller.close();
                // Save to local SQLite database
                try {
                  const { db } = await import("@/db");
                  const { chatHistory } = await import("@/db/schema");
                  const question = String(messages[messages.length - 1]?.content ?? "").slice(0, 8000);
                  await db.insert(chatHistory).values({
                    id: crypto.randomUUID(),
                    userId: "owner",
                    channel: String(channel),
                    question,
                    answer: answerText.slice(0, 40000),
                    model: selectedModelId,
                    createdAt: Date.now(),
                  });
                } catch (dbErr) {
                  console.error("Failed to save chat history to local SQLite:", dbErr);
                }
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (error) {
          console.error("Chat generation failed:", error);
          const msg = error instanceof Error ? error.message : "Failed to generate reply.";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
