import { createFileRoute } from "@tanstack/react-router";
import {
  GEMINI_MODELS,
  OPENAI_MODELS,
  OLLAMA_MODELS,
  NVIDIA_MODELS,
  DEFAULT_MODEL_ID,
  type ModelOption,
} from "@/lib/models-data";

export { type ModelOption };

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

        let defaultModel = DEFAULT_MODEL_ID;
        if (customUrl && process.env["AI_MODEL"]) {
          defaultModel = process.env["AI_MODEL"];
        } else if (geminiKey) {
          defaultModel = DEFAULT_MODEL_ID;
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
