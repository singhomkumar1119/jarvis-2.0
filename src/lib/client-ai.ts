export type ClientChatMessage = {
  role: "user" | "assistant" | "jarvis";
  content?: string | undefined;
  text?: string | undefined;
  attachments?:
    | Array<{
        name: string;
        mediaType?: string | undefined;
        dataUrl?: string | undefined;
      }>
    | undefined;
};

const PERSONALITY: Record<string, string> = {
  concise: "Answer in as few words as possible. No filler, no preamble.",
  balanced: "Answer clearly and warmly, with just enough detail to be useful.",
  playful: "Answer with wit and a light, charming tone, while still being accurate.",
  technical: "Answer with precise technical depth, naming exact tools, commands and trade-offs.",
};

export function getSystemPrompt(
  channel: "chat" | "terminal" = "chat",
  personality = "balanced",
): string {
  const tone = PERSONALITY[personality] ?? PERSONALITY["balanced"]!;
  const base = `You are Jarvis, a calm, capable personal AI assistant with a cinematic, futuristic presence. ${tone} Never mention which AI model or vendor powers you.`;
  if (channel === "terminal") {
    return `${base}\nYou are answering in a developer terminal. Be command-oriented: give the exact command or code first inside a fenced code block with a language tag, then at most two short lines of explanation.`;
  }
  return `${base}\nKeep replies conversational and suitable to be read aloud: short paragraphs, no markdown tables, no long bullet lists. Use fenced code blocks only when the user asks for code.`;
}

// Default key fallback (from project configuration or environment)
const BUNDLED_GEMINI_KEY = (import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined) || "";
const DEFAULT_NVIDIA_KEY =
  (import.meta.env["VITE_NVIDIA_API_KEY"] as string | undefined) ||
  "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";

export function getProviderApiKey(provider: "gemini" | "openai" | "nvidia" | "custom"): string {
  if (typeof window === "undefined") return "";
  if (provider === "gemini") {
    return (
      localStorage.getItem("jarvis_gemini_api_key") ||
      (import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined) ||
      BUNDLED_GEMINI_KEY
    );
  }
  if (provider === "openai") {
    return (
      localStorage.getItem("jarvis_openai_api_key") ||
      (import.meta.env["VITE_OPENAI_API_KEY"] as string | undefined) ||
      ""
    );
  }
  if (provider === "nvidia") {
    return (
      localStorage.getItem("jarvis_nvidia_api_key") ||
      (import.meta.env["VITE_NVIDIA_API_KEY"] as string | undefined) ||
      DEFAULT_NVIDIA_KEY
    );
  }
  return (
    localStorage.getItem("jarvis_custom_api_key") ||
    (import.meta.env["VITE_AI_API_KEY"] as string | undefined) ||
    ""
  );
}

export function getOllamaBaseUrl(): string {
  if (typeof window === "undefined") return "http://localhost:11434";
  return (
    localStorage.getItem("jarvis_ollama_base_url") ||
    (import.meta.env["VITE_OLLAMA_BASE_URL"] as string | undefined) ||
    "http://localhost:11434"
  );
}

export async function streamClientAI({
  model = "gemini-3.5-flash-lite",
  messages,
  channel = "chat",
  personality = "balanced",
  signal,
  onChunk,
}: {
  model?: string | undefined;
  messages: ClientChatMessage[];
  channel?: "chat" | "terminal" | undefined;
  personality?: string | undefined;
  signal?: AbortSignal | undefined;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const sysPrompt = getSystemPrompt(channel, personality);

  // Determine provider
  const isGemini =
    model.startsWith("gemini") ||
    model.startsWith("gemma") ||
    !model ||
    model.includes("flash") ||
    model.includes("pro");
  const isOpenAI = model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3");
  const isOllama =
    model === "deepseek-r1" ||
    model === "llama3.2" ||
    model === "mistral" ||
    model.startsWith("ollama");
  const isNvidia = model.startsWith("nvidia/");

  if (isGemini) {
    return streamGeminiWithFallback(model, messages, sysPrompt, signal, onChunk);
  } else if (isOpenAI) {
    return streamOpenAI(model, messages, sysPrompt, signal, onChunk);
  } else if (isOllama) {
    return streamOllama(model, messages, sysPrompt, signal, onChunk);
  } else if (isNvidia) {
    return streamOpenAICompatible(
      "https://integrate.api.nvidia.com/v1",
      getProviderApiKey("nvidia"),
      model,
      messages,
      sysPrompt,
      signal,
      onChunk,
    );
  } else {
    // Default fallback to Gemini
    return streamGeminiWithFallback("gemini-3.5-flash-lite", messages, sysPrompt, signal, onChunk);
  }
}

async function streamGeminiWithFallback(
  model: string,
  messages: ClientChatMessage[],
  systemPromptText: string,
  signal: AbortSignal | undefined,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const fallbackList = [
    model,
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: Error | null = null;
  const geminiKey = getProviderApiKey("gemini");
  if (geminiKey) {
    for (const m of fallbackList) {
      try {
        return await streamGemini(m, messages, systemPromptText, signal, onChunk);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") throw err;
        lastError = err as Error;
        console.warn(`[Jarvis AI] Model ${m} failed, attempting next fallback...`, err);
      }
    }
  }

  // If Gemini failed or has no key, seamlessly fall back to working NVIDIA NIM!
  const nvidiaKey = getProviderApiKey("nvidia");
  if (nvidiaKey) {
    console.warn("[Jarvis AI] Gemini endpoint unavailable. Seamlessly failing over to NVIDIA NIM...");
    return streamOpenAICompatible(
      "https://integrate.api.nvidia.com/v1",
      nvidiaKey,
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      messages,
      systemPromptText,
      signal,
      onChunk,
    );
  }

  throw (
    lastError ||
    new Error(
      "AI model failed to respond. Please check your API key in Settings or choose an available model.",
    )
  );
}

async function streamGemini(
  model: string,
  messages: ClientChatMessage[],
  systemPromptText: string,
  signal: AbortSignal | undefined,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const apiKey = getProviderApiKey("gemini");
  if (!apiKey) {
    throw new Error(
      "Google Gemini API key is missing. Please add your GEMINI_API_KEY in Settings or .env",
    );
  }

  // Format contents for Gemini API
  const contents = messages
    .filter((m) => !!(m.text || m.content || m.attachments?.length))
    .map((m) => {
      const parts: Array<{
        text?: string | undefined;
        inlineData?: { mimeType: string; data: string } | undefined;
      }> = [];
      const textContent = m.text || m.content || "";
      if (textContent) {
        parts.push({ text: textContent });
      }
      if (m.attachments?.length) {
        for (const att of m.attachments) {
          if (att.dataUrl && att.dataUrl.includes(",")) {
            const partsArray = att.dataUrl.split(",");
            const header = partsArray[0] ?? "";
            const base64 = partsArray[1] ?? "";
            const mimeType = att.mediaType || header.match(/:(.*?);/)?.[1] || "image/jpeg";
            if (base64) {
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64,
                },
              });
            }
          }
        }
      }
      return {
        role: m.role === "assistant" || m.role === "jarvis" ? "model" : "user",
        parts,
      };
    });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemPromptText }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  };
  if (signal) {
    requestInit.signal = signal;
  }

  const res = await fetch(url, requestInit);

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}): ${errorText || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const textChunk =
          parsed?.candidates?.[0]?.content?.parts?.[0]?.text ||
          parsed?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || "")
            .join("") ||
          "";
        if (textChunk) {
          full += textChunk;
          onChunk(full);
        }
      } catch {
        // SSE partial JSON continue
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    try {
      const parsed = JSON.parse(buffer.trim().slice(5).trim());
      const textChunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (textChunk) {
        full += textChunk;
        onChunk(full);
      }
    } catch {
      // ignore
    }
  }

  return full;
}

async function streamOpenAI(
  model: string,
  messages: ClientChatMessage[],
  systemPromptText: string,
  signal: AbortSignal | undefined,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const apiKey = getProviderApiKey("openai");
  if (!apiKey) {
    throw new Error(
      "OpenAI API key is missing. Please configure your OpenAI key in Settings to use GPT models.",
    );
  }

  return streamOpenAICompatible(
    "https://api.openai.com/v1",
    apiKey,
    model,
    messages,
    systemPromptText,
    signal,
    onChunk,
  );
}

async function streamOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ClientChatMessage[],
  systemPromptText: string,
  signal: AbortSignal | undefined,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const chatMessages = [
    { role: "system", content: systemPromptText },
    ...messages.map((m) => ({
      role: m.role === "assistant" || m.role === "jarvis" ? "assistant" : "user",
      content: m.text || m.content || "",
    })),
  ];

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      stream: true,
      max_tokens: 4096,
    }),
  };
  if (signal) {
    requestInit.signal = signal;
  }

  const res = await fetch(`${cleanBase}/chat/completions`, requestInit);

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`AI Provider error (${res.status}): ${errorText || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let reasoningBackup = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta;
        const token = delta?.content || "";
        if (token) {
          full += token;
          onChunk(full);
        } else if (delta?.reasoning_content) {
          reasoningBackup += delta.reasoning_content;
        }
      } catch {
        // partial JSON
      }
    }
  }

  if (!full.trim() && reasoningBackup.trim()) {
    full = reasoningBackup.trim();
    onChunk(full);
  }

  return full;
}

async function streamOllama(
  model: string,
  messages: ClientChatMessage[],
  systemPromptText: string,
  signal: AbortSignal | undefined,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const baseUrl = getOllamaBaseUrl().replace(/\/+$/, "");
  const chatMessages = [
    { role: "system", content: systemPromptText },
    ...messages.map((m) => ({
      role: m.role === "assistant" || m.role === "jarvis" ? "assistant" : "user",
      content: m.text || m.content || "",
    })),
  ];

  let res: Response;
  const requestInit: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      stream: true,
    }),
  };
  if (signal) {
    requestInit.signal = signal;
  }

  try {
    res = await fetch(`${baseUrl}/api/chat`, requestInit);
  } catch {
    throw new Error(
      `Could not connect to Ollama at ${baseUrl}. Ensure Ollama is running locally (e.g. 'ollama run ${model}') and CORS origins are enabled.`,
    );
  }

  if (!res.ok || !res.body) {
    throw new Error(`Ollama error (${res.status}): ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        const token = parsed?.message?.content || "";
        if (token) {
          full += token;
          onChunk(full);
        }
      } catch {
        // partial line
      }
    }
  }

  return full;
}
