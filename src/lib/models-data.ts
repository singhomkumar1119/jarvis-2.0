export type ModelOption = {
  id: string;
  name: string;
  label: string;
  tier: string;
  provider: "gemini" | "openai" | "ollama" | "nvidia" | "custom";
  description: string;
  configured?: boolean | undefined;
};

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    label: "Gemini 3.5 Flash Lite",
    tier: "Fast & Stable",
    provider: "gemini",
    description: "Ultra-fast response time & verified reliable (Recommended)",
    configured: true,
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    label: "Gemini 3.5 Flash",
    tier: "Balanced",
    provider: "gemini",
    description: "State-of-the-art multimodal reasoning with high stability",
    configured: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    label: "Gemini 3.1 Flash Lite",
    tier: "Lite",
    provider: "gemini",
    description: "Efficient lightweight reasoning & low latency",
    configured: true,
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    label: "Gemini 3.8 Flash",
    tier: "High",
    provider: "gemini",
    description: "High reasoning capacity with automatic fallback",
    configured: true,
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    label: "Gemini 3.7 Flash",
    tier: "Hybrid",
    provider: "gemini",
    description: "Hybrid reasoning model with automatic fallback",
    configured: true,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    label: "Gemini 3.1 Pro",
    tier: "Pro",
    provider: "gemini",
    description: "Deep analytical thinking & complex problem solving",
    configured: true,
  },
];

export const OPENAI_MODELS: ModelOption[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    label: "GPT-4o",
    tier: "Smart",
    provider: "openai",
    description: "Flagship intelligence for multivariable reasoning",
    configured: false,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    label: "GPT-4o Mini",
    tier: "Fast",
    provider: "openai",
    description: "Lightweight, fast and cost-effective",
    configured: false,
  },
];

export const OLLAMA_MODELS: ModelOption[] = [
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    label: "DeepSeek R1",
    tier: "Reasoning",
    provider: "ollama",
    description: "Deep open reasoning running 100% locally on device",
    configured: false,
  },
  {
    id: "llama3.2",
    name: "Llama 3.2",
    label: "Llama 3.2",
    tier: "Local",
    provider: "ollama",
    description: "Fast local edge inference without internet access",
    configured: false,
  },
  {
    id: "mistral",
    name: "Mistral 7B",
    label: "Mistral 7B",
    tier: "Local",
    provider: "ollama",
    description: "Proven open-weights model for general tasks",
    configured: false,
  },
];

export const NVIDIA_MODELS: ModelOption[] = [
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron 3 Nano",
    label: "Nemotron 3 Nano Omni 30B",
    tier: "High",
    provider: "nvidia",
    description: "NVIDIA NIM optimized reasoning model",
    configured: false,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    name: "Nemotron 3 Ultra",
    label: "Nemotron 3 Ultra 550B",
    tier: "Pro",
    provider: "nvidia",
    description: "Enterprise ultra-scale model on accelerated cloud",
    configured: false,
  },
];

export const ALL_MODELS: ModelOption[] = [
  ...GEMINI_MODELS,
  ...OPENAI_MODELS,
  ...OLLAMA_MODELS,
  ...NVIDIA_MODELS,
];

export const DEFAULT_MODEL_ID = "gemini-3.5-flash-lite";

export const PROVIDER_NAMES: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  ollama: "Local / Ollama",
  nvidia: "NVIDIA NIM",
  custom: "Custom Endpoint",
};
