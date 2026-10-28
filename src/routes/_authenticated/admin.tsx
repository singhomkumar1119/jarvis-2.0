import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { logout, getAuthStatus } from "@/lib/auth-client";
import { listVisitorEvents, type VisitorEvent } from "@/lib/admin.functions";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Jarvis Activity Console" },
      {
        name: "description",
        content: "Private console showing messages and activity logged in your local database.",
      },
      { property: "og:title", content: "Jarvis Activity Console" },
      { property: "og:description", content: "Local database activity and diagnostics in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Filter = "all" | "message" | "upload" | "visit";

function AdminPage() {
  const navigate = useNavigate();
  const load = useServerFn(listVisitorEvents);
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = useCallback(async () => {
    const status = await getAuthStatus();
    if (status.required && !status.authenticated) {
      void navigate({ to: "/auth" });
      return;
    }
    try {
      const res = await load({ data: { limit: 300 } });
      setEvents(res.events);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, [load, navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = events.filter((e) => filter === "all" || e.event_type === filter);
  const sessions = new Set(events.map((e) => e.session_id)).size;

  return (
    <Page padBottom={false}>
      <PageHeader title="Activity Console" subtitle="System diagnostics and local event log" />

      {state === "loading" && (
        <Panel className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          Reading local database…
        </Panel>
      )}

      {state === "denied" && (
        <Panel className="p-8 text-center">
          <p className="text-sm text-foreground">Access not verified.</p>
          <button
            onClick={async () => {
              await logout();
            }}
            className="glass-soft mt-4 rounded-full px-4 py-2 text-xs"
          >
            Sign out
          </button>
        </Panel>
      )}

      {state === "ready" && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Panel className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Events</p>
              <p className="text-2xl font-medium text-foreground">{events.length}</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sessions</p>
              <p className="text-2xl font-medium text-foreground">{sessions}</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Uploads</p>
              <p className="text-2xl font-medium text-foreground">
                {events.filter((e) => e.event_type === "upload").length}
              </p>
            </Panel>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["all", "message", "upload", "visit"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "glass-soft rounded-full px-3.5 py-1.5 text-[11px] capitalize",
                  filter === f && "bg-primary text-primary-foreground",
                )}
              >
                {f}
              </button>
            ))}
            <button onClick={() => void refresh()} className="glass-soft rounded-full px-3.5 py-1.5 text-[11px]">
              Refresh
            </button>
            <button
              onClick={async () => {
                await logout();
              }}
              className="glass-soft ml-auto rounded-full px-3.5 py-1.5 text-[11px]"
            >
              Lock / Sign out
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {shown.length === 0 && <Panel>No activity recorded yet.</Panel>}
            {shown.map((e) => (
              <Panel key={e.id} className="p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                  <span className="glass-soft rounded-full px-2.5 py-1 capitalize text-foreground/90">
                    {e.event_type}
                  </span>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                  {e.channel && <span>via {e.channel}</span>}
                </div>
                {e.content && (
                  <p className="mt-2 text-sm text-foreground line-clamp-3 [overflow-wrap:anywhere]">
                    {e.content}
                  </p>
                )}
                {e.file_name && (
                  <div className="mt-2 text-xs text-cyan">
                    File: {e.file_name} {e.file_size ? `(${Math.round(e.file_size / 1024)} KB)` : ""}
                  </div>
                )}
              </Panel>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
