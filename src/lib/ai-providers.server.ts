import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Direct AI Providers for self-hosted Jarvis:
 * - Google Gemini (native OpenAI-compatible endpoint)
 * - OpenAI (direct official API)
 * - Ollama (100% private, offline, running locally on your hardware)
 * - NVIDIA NIM
 * - Custom OpenAI-compatible endpoints
 */

export function createGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey,
  });
}

export function createOpenAIProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai",
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey,
  });
}

export function createOllamaProvider(baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1") {
  return createOpenAICompatible({
    name: "ollama",
    baseURL,
  });
}

export function createNvidiaProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "nvidia",
    baseURL: "https://integrate.api.nvidia.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export function createCustomProvider(baseURL: string, apiKey?: string) {
  return createOpenAICompatible({
    name: "custom",
    baseURL,
    ...(apiKey ? { apiKey } : {}),
  });
}
