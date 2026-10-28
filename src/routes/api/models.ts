import { createFileRoute } from "@tanstack/react-router";

export type ModelOption = {
  id: string;
  label: string;
  provider: "gemini" | "openai" | "ollama" | "nvidia" | "custom";
};

const GEMINI_MODELS: ModelOption[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Fastest & Recommended)", provider: "gemini" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Deep Reasoning)", provider: "gemini" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "gemini" },
];

const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
];

const OLLAMA_MODELS: ModelOption[] = [
  { id: "llama3.2", label: "Llama 3.2 (Local)", provider: "ollama" },
  { id: "mistral", label: "Mistral 7B (Local)", provider: "ollama" },
  { id: "deepseek-r1", label: "DeepSeek R1 (Local)", provider: "ollama" },
];

const NVIDIA_MODELS: ModelOption[] = [
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", label: "Nemotron 3 Nano Omni 30B", provider: "nvidia" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B", provider: "nvidia" },
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
        const nvidiaKey = process.env["NVIDIA_API_KEY"];
        const customUrl = process.env["AI_BASE_URL"];

        // Add Gemini models if key is configured (or by default)
        for (const m of GEMINI_MODELS) add(m);

        if (openaiKey) {
          for (const m of OPENAI_MODELS) add(m);
        }

        if (nvidiaKey) {
          for (const m of NVIDIA_MODELS) add(m);
        }

        if (process.env["OLLAMA_BASE_URL"]) {
          for (const m of OLLAMA_MODELS) add(m);
        }

        if (customUrl) {
          const customModel = process.env["AI_MODEL"] || "custom-model";
          add({ id: customModel, label: `Custom: ${customModel}`, provider: "custom" });
        }

        let defaultModel = GEMINI_MODELS[0]!.id;
        if (customUrl && process.env["AI_MODEL"]) {
          defaultModel = process.env["AI_MODEL"];
        } else if (geminiKey) {
          defaultModel = GEMINI_MODELS[0]!.id;
        } else if (openaiKey) {
          defaultModel = OPENAI_MODELS[0]!.id;
        } else if (nvidiaKey) {
          defaultModel = NVIDIA_MODELS[0]!.id;
        }

        return Response.json({
          models,
          defaultModel,
        });
      },
    },
  },
});
