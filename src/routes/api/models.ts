import { createFileRoute } from "@tanstack/react-router";

export type ModelOption = {
  id: string;
  name: string;
  label: string;
  tier: string;
  provider: "gemini" | "openai" | "ollama" | "nvidia" | "custom";
  description: string;
  configured?: boolean;
};

const GEMINI_MODELS: ModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    label: "Gemini 3.5 Flash Lite",
    tier: "Fast & Stable",
    provider: "gemini",
    description: "Ultra-fast response time & verified reliable (Recommended)",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    label: "Gemini 3.5 Flash",
    tier: "Balanced",
    provider: "gemini",
    description: "State-of-the-art multimodal reasoning with high stability",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    label: "Gemini 3.1 Flash Lite",
    tier: "Lite",
    provider: "gemini",
    description: "Efficient lightweight reasoning & low latency",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    label: "Gemini 3.8 Flash",
    tier: "High",
    provider: "gemini",
    description: "High reasoning capacity with automatic fallback",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    label: "Gemini 3.7 Flash",
    tier: "Hybrid",
    provider: "gemini",
    description: "Hybrid reasoning model with automatic fallback",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    label: "Gemini 3.1 Pro",
    tier: "Pro",
    provider: "gemini",
    description: "Deep analytical thinking & complex problem solving",
  },
];

const OPENAI_MODELS: ModelOption[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    label: "GPT-4o",
    tier: "Smart",
    provider: "openai",
    description: "Flagship intelligence for multivariable reasoning",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    label: "GPT-4o Mini",
    tier: "Fast",
    provider: "openai",
    description: "Lightweight, fast and cost-effective",
  },
];

const OLLAMA_MODELS: ModelOption[] = [
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    label: "DeepSeek R1",
    tier: "Reasoning",
    provider: "ollama",
    description: "Deep open reasoning running 100% locally on device",
  },
  {
    id: "llama3.2",
    name: "Llama 3.2",
    label: "Llama 3.2",
    tier: "Local",
    provider: "ollama",
    description: "Fast local edge inference without internet access",
  },
  {
    id: "mistral",
    name: "Mistral 7B",
    label: "Mistral 7B",
    tier: "Local",
    provider: "ollama",
    description: "Proven open-weights model for general tasks",
  },
];

const NVIDIA_MODELS: ModelOption[] = [
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron 3 Nano",
    label: "Nemotron 3 Nano Omni 30B",
    tier: "High",
    provider: "nvidia",
    description: "NVIDIA NIM optimized reasoning model",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    name: "Nemotron 3 Ultra",
    label: "Nemotron 3 Ultra 550B",
    tier: "Pro",
    provider: "nvidia",
    description: "Enterprise ultra-scale model on accelerated cloud",
  },
];

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async () => {
        const models: ModelOption[] = [];
        const seen = new Set<string>();
        const add = (m: ModelOption) => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            models.push(m);
          }
        };

        const geminiKey = process.env["GEMINI_API_KEY"];
        const openaiKey = process.env["OPENAI_API_KEY"];
        const ollamaConfigured = !!process.env["OLLAMA_BASE_URL"];
        const nvidiaKey = process.env["NVIDIA_API_KEY"];
        const customUrl = process.env["AI_BASE_URL"];

        // Add Gemini models with configured status
        for (const m of GEMINI_MODELS) {
          add({ ...m, configured: !!geminiKey });
        }

        // Add OpenAI models
        for (const m of OPENAI_MODELS) {
          add({ ...m, configured: !!openaiKey });
        }

        // Add Ollama models
        for (const m of OLLAMA_MODELS) {
          add({ ...m, configured: ollamaConfigured });
        }

        // Add NVIDIA models
        for (const m of NVIDIA_MODELS) {
          add({ ...m, configured: !!nvidiaKey });
        }

        if (customUrl) {
          const customModel = process.env["AI_MODEL"] || "custom-model";
          add({
            id: customModel,
            name: customModel,
            label: `Custom: ${customModel}`,
            tier: "Custom",
            provider: "custom",
            description: "Custom OpenAI-compatible provider endpoint",
            configured: true,
          });
        }

        let defaultModel = "gemini-3.5-flash-lite";
        if (customUrl && process.env["AI_MODEL"]) {
          defaultModel = process.env["AI_MODEL"];
        } else if (geminiKey) {
          defaultModel = "gemini-3.5-flash-lite";
        } else if (openaiKey) {
          defaultModel = OPENAI_MODELS[0]!.id;
        } else if (nvidiaKey) {
          defaultModel = NVIDIA_MODELS[0]!.id;
        }

        // Prioritize configured models so the user sees working models immediately
        models.sort((a, b) => {
          if (a.id === defaultModel) return -1;
          if (b.id === defaultModel) return 1;
          if (a.configured && !b.configured) return -1;
          if (!a.configured && b.configured) return 1;
          return 0;
        });

        return Response.json({
          models,
          defaultModel,
        });
      },
    },
  },
});
