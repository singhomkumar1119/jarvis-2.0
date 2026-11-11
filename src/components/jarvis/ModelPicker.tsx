import { useEffect, useRef, useState } from "react";
import { Check, ChevronUp, Cpu, Search, Sparkles } from "lucide-react";
import { useJarvis } from "@/lib/jarvis-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ModelOption = {
  id: string;
  name?: string;
  label: string;
  tier?: string;
  provider: "gemini" | "openai" | "ollama" | "nvidia" | "custom";
  description?: string;
  configured?: boolean;
};

let cache: { models: ModelOption[]; defaultModel: string } | null = null;

const PROVIDER_NAMES: Record<string, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  ollama: "Local / Ollama",
  nvidia: "NVIDIA NIM",
  custom: "Custom Endpoint",
};

export function useModelCatalog() {
  const { settings, updateSettings } = useJarvis();
  const [data, setData] = useState(cache);

  useEffect(() => {
    if (cache) {
      setData(cache);
      return;
    }
    let alive = true;
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive || !json) return;
        cache = json as { models: ModelOption[]; defaultModel: string };
        setData(cache);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const models = data?.models ?? [];
  const activeId = settings.model || data?.defaultModel || "gemini-3.5-flash-lite";
  const activeModel = models.find((m) => m.id === activeId) || {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    label: "Gemini 3.5 Flash Lite",
    tier: "Fast & Stable",
    provider: "gemini" as const,
    description: "Ultra-fast response time & verified reliable (Recommended)",
    configured: true,
  };

  const selectModel = (id: string) => {
    updateSettings({ model: id });
    const target = models.find((m) => m.id === id);
    const title = target?.name || target?.label || id;
    const tier = target?.tier || "Standard";
    if (target?.configured === false) {
      toast.warning(`${title} requires API configuration in .env to function.`);
    } else {
      toast.success(`Switched to ${title} (${tier})`);
    }
  };

  return {
    models,
    activeId,
    activeModel,
    selectModel,
  };
}

export function ModelPickerMenu({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const { models, activeId, selectModel } = useModelCatalog();
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const filtered = query.trim()
    ? models.filter((m) =>
        `${m.name ?? ""} ${m.label} ${m.id} ${m.provider} ${m.tier ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : models;

  return (
    <div
      ref={menuRef}
      className={cn(
        "glass absolute bottom-[calc(100%+0.75rem)] left-2 z-50 w-84 max-w-[calc(100vw-2rem)]",
        "overflow-hidden rounded-2xl p-2.5 shadow-2xl border border-white/15 backdrop-blur-3xl",
        "animate-in fade-in zoom-in-95 duration-200 origin-bottom-left",
        className,
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
      role="dialog"
      aria-label="Select AI Model"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/90">
          <Sparkles className="size-3.5 text-[--color-electric]" />
          Select AI Model
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {models.length} Available
        </span>
      </div>

      {/* Search Bar */}
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 border border-white/5 focus-within:border-white/20">
        <Search className="size-3.5 text-muted-foreground/70 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search models (e.g. Gemini, GPT, DeepSeek)..."
          className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Models List */}
      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No matching models found.
          </p>
        )}

        {filtered.map((m) => {
          const isCurrent = m.id === activeId;
          const title = m.name || m.label.replace(/\s*\(.*?\)\s*/g, "");
          const tier = m.tier || "Standard";

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                selectModel(m.id);
                onClose();
                setQuery("");
              }}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors duration-150",
                isCurrent
                  ? "bg-white/[0.08] border border-white/10 text-foreground"
                  : "hover:bg-white/[0.05] text-foreground/80 hover:text-foreground",
              )}
            >
              <Cpu
                className={cn(
                  "size-4 shrink-0 mt-0.5",
                  isCurrent ? "text-[--color-electric]" : "text-muted-foreground/60",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-foreground truncate">{title}</span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-muted-foreground/80 font-normal">
                    {tier}
                  </span>
                  {m.configured !== false ? (
                    <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 text-[10px] font-normal border border-emerald-500/20">
                      Ready
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 text-amber-300 px-1.5 py-0.2 text-[10px] font-normal border border-amber-500/20">
                      Needs Key
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/50">
                    {PROVIDER_NAMES[m.provider] || m.provider}
                  </span>
                </div>
                {m.description && (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                    {m.description}
                  </p>
                )}
              </div>
              {isCurrent && (
                <Check className="size-4 text-[--color-electric] shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ModelPickerPill({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  const { activeModel } = useModelCatalog();
  const displayName = activeModel.name || activeModel.label.replace(/\s*\(.*?\)\s*/g, "");
  const displayTier = activeModel.tier || "High";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Current AI model: ${displayName} ${displayTier}. Click to change model.`}
      aria-expanded={open}
      className={cn(
        "group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all duration-200 select-none",
        "border border-white/5 bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/10 active:scale-95",
        open && "bg-white/[0.1] border-white/15 shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)]",
        className,
      )}
    >
      <span className="font-medium text-foreground/90 group-hover:text-foreground">
        {displayName}
      </span>
      <span className="text-[11px] text-muted-foreground/75 font-normal">
        {displayTier}
      </span>
      <ChevronUp
        className={cn(
          "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200",
          open ? "rotate-180" : "rotate-0",
        )}
      />
    </button>
  );
}

export function ModelPicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <ModelPickerPill open={open} onClick={() => setOpen((v) => !v)} />
      <ModelPickerMenu open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
