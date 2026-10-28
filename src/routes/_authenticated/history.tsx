import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Chat History — Jarvis" },
      { name: "description", content: "Your private Jarvis chat history, stored safely in your local database." },
      { property: "og:title", content: "Chat History — Jarvis" },
      { property: "og:description", content: "Self-hosted conversation history with Jarvis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  model: string | null;
  created_at: number;
};

function HistoryPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async (): Promise<HistoryItem[]> => {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error("Failed to load history");
      const json = await res.json();
      return json.history ?? [];
    },
  });

  async function remove(id?: string) {
    try {
      const url = id ? `/api/history?id=${encodeURIComponent(id)}` : "/api/history";
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast(id ? "Chat deleted" : "History cleared");
      qc.invalidateQueries({ queryKey: ["chat-history"] });
    } catch {
      toast.error("Couldn't delete");
    }
  }

  return (
    <Page padBottom={false}>
      <PageHeader title="Chat History" subtitle="Stored locally on your machine" />
      <div className="space-y-4">
        {data.length > 0 && (
          <button
            onClick={() => remove()}
            className="flex items-center gap-2 rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <p className="glass rounded-3xl px-5 py-10 text-center text-sm text-muted-foreground">
            No saved chats yet. Talk to Jarvis and your chats will appear here.
          </p>
        )}
        {data.map((c) => (
          <Panel key={c.id}>
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{new Date(c.created_at).toLocaleString()} {c.model ? `• ${c.model}` : ""}</span>
              <button aria-label="Delete chat" onClick={() => remove(c.id)} className="hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{c.question}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6 [overflow-wrap:anywhere]">{c.answer}</p>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
