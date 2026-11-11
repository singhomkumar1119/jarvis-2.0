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

type ResolvedModel = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  modelId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbacks?: Array<{ id: string; instance: any }>;
};

function resolveModel(requestedModel?: string): ResolvedModel {
  const geminiKey = process.env["GEMINI_API_KEY"];
  const openaiKey = process.env["OPENAI_API_KEY"];
  const ollamaUrl = process.env["OLLAMA_BASE_URL"];
  const nvidiaKey = process.env["NVIDIA_API_KEY"];
  const customUrl = process.env["AI_BASE_URL"];

  const rawId = requestedModel?.trim();

  // Determine provider intent
  const isGemini =
    rawId?.startsWith("gemini") ||
    rawId?.startsWith("gemma") ||
    (!rawId && geminiKey);

  const isOpenAI =
    rawId?.startsWith("gpt-") ||
    rawId?.startsWith("o1") ||
    rawId?.startsWith("o3") ||
    (!rawId && !geminiKey && openaiKey);

  const isOllama =
    rawId === "deepseek-r1" ||
    rawId === "llama3.2" ||
    rawId === "mistral" ||
    rawId?.startsWith("ollama");

  const isNvidia = rawId?.startsWith("nvidia/") || (!rawId && !geminiKey && !openaiKey && nvidiaKey);

  const isCustom = rawId === "custom" || (!rawId && customUrl);

  // 1. Google Gemini
  if (isGemini) {
    if (!geminiKey) {
      throw new Error("Google Gemini API key is missing. Please add GEMINI_API_KEY to your .env file.");
    }
    const provider = createGeminiProvider(geminiKey);
    const activeId = rawId || "gemini-3.5-flash-lite";

    // Resilient fallback models that are verified to be online
    const fallbackIds = [
      activeId,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemma-4-26b-a4b-it",
    ].filter((id, idx, arr) => arr.indexOf(id) === idx);

    return {
      model: provider(activeId),
      modelId: activeId,
      fallbacks: fallbackIds.slice(1).map((id) => ({
        id,
        instance: provider(id),
      })),
    };
  }

  // 2. OpenAI models
  if (isOpenAI) {
    if (!openaiKey) {
      throw new Error(
        "OpenAI API key is missing. Please configure OPENAI_API_KEY in your .env file to use OpenAI models."
      );
    }
    const activeId = rawId || "gpt-4o-mini";
    const provider = createOpenAIProvider(openaiKey);
    return { model: provider(activeId), modelId: activeId };
  }

  // 3. Ollama local
  if (isOllama) {
    const activeId = rawId?.replace("ollama/", "") || "llama3.2";
    const provider = createOllamaProvider(ollamaUrl);
    return { model: provider(activeId), modelId: activeId };
  }

  // 4. Custom endpoint
  if (isCustom || customUrl) {
    if (!customUrl) {
      throw new Error("Custom AI endpoint URL is missing. Please configure AI_BASE_URL in your .env file.");
    }
    const activeId = rawId || process.env["AI_MODEL"] || "custom-model";
    const provider = createCustomProvider(customUrl, process.env["AI_API_KEY"]);
    return { model: provider(activeId), modelId: activeId };
  }

  // 5. Nvidia
  if (isNvidia) {
    if (!nvidiaKey) {
      throw new Error(
        "NVIDIA NIM API key is missing. Please configure NVIDIA_API_KEY in your .env file."
      );
    }
    const activeId = rawId || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
    const provider = createNvidiaProvider(nvidiaKey);
    return { model: provider(activeId), modelId: activeId };
  }

  // Default fallback if nothing matched
  if (geminiKey) {
    const provider = createGeminiProvider(geminiKey);
    return {
      model: provider("gemini-3.5-flash-lite"),
      modelId: "gemini-3.5-flash-lite",
    };
  }

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

        let resolved: ResolvedModel;
        try {
          resolved = resolveModel(body.model);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI model configuration error.";
          return new Response(msg, { status: 400 });
        }

        const selectedModelInstance = resolved.model;
        let selectedModelId = resolved.modelId;
        const fallbacks = resolved.fallbacks ?? [];

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
          const encoder = new TextEncoder();
          let answerText = "";

          const stream = new ReadableStream({
            async start(controller) {
              const enqueue = (chunk: string) => {
                answerText += chunk;
                controller.enqueue(encoder.encode(chunk));
              };

              let chunksCount = 0;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const streamCandidate = async (modelInstance: any, modelName: string) => {
                try {
                  const result = streamText({
                    model: modelInstance,
                    system: systemPrompt(channel, personality),
                    messages: modelMessages,
                    maxRetries: 1,
                  });

                  for await (const chunk of result.textStream) {
                    chunksCount++;
                    enqueue(chunk);
                  }
                  if (chunksCount > 0) {
                    selectedModelId = modelName;
                    return true;
                  }
                } catch (err) {
                  console.warn(`[Jarvis Model Stream] Attempt on ${modelName} failed:`, err);
                }
                return false;
              };

              // 1. Attempt with user-selected model
              await streamCandidate(selectedModelInstance, selectedModelId);

              // 2. If primary failed or yielded 0 chunks (e.g. 503 high demand or 429 quota), try fallbacks
              if (chunksCount === 0 && fallbacks.length > 0) {
                for (const fb of fallbacks) {
                  const success = await streamCandidate(fb.instance, fb.id);
                  if (success) break;
                }
              }

              // 3. If still 0 chunks emitted, give friendly Jarvis explanation
              if (chunksCount === 0) {
                const politeMsg =
                  `Jarvis is currently unable to reach ${selectedModelId} due to provider rate limits or capacity spikes. ` +
                  `Please switch to Gemini 3.5 Flash Lite in the model picker, or retry in a moment.`;
                enqueue(politeMsg);
              }

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
