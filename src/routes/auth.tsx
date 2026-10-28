import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, Sparkles, ArrowRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthStatus, loginWithPin } from "@/lib/auth-client";

function safeNext(value: unknown): string {
  if (typeof value !== "string" || !/^\/(?![\/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(value)) return "";
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s["next"]);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Authenticate — Jarvis AI" },
      { name: "description", content: "Authenticate to your personal self-hosted Jarvis AI assistant." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinRequired, setPinRequired] = useState<boolean | null>(null);

  const done = () => void navigate({ to: next || "/", replace: true });

  useEffect(() => {
    void getAuthStatus().then((status) => {
      if (!status.required || status.authenticated) {
        done();
      } else {
        setPinRequired(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setBusy(true);
    try {
      const ok = await loginWithPin(pin);
      if (ok) {
        toast.success("Security clearance verified. Welcome back, sir.");
        done();
      } else {
        toast.error("Access denied: Invalid PIN.");
      }
    } catch {
      toast.error("Authentication error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      {/* Background glow effects */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, var(--electric) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-1/4 h-96 w-96 rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, var(--violet) 0%, transparent 70%)" }}
      />

      <div className="glass-panel relative w-full max-w-md rounded-3xl border border-white/10 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 shadow-[0_0_25px_rgba(0,240,255,0.25)]">
            <Lock className="h-7 w-7 text-cyan" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            JARVIS // OS
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-cyan/80">
            Security Clearance Protocol
          </p>
        </div>

        {pinRequired === null ? (
          <div className="mt-8 text-center text-sm text-muted-foreground animate-pulse">
            Verifying system credentials…
          </div>
        ) : pinRequired ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="pin-input" className="text-xs font-medium text-white/70">
                Security PIN / Master Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pin-input"
                  type="password"
                  placeholder="Enter your security PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="glass h-12 rounded-xl pl-10 pr-4 text-center tracking-widest text-white placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-cyan"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy || !pin}
              className="h-12 w-full rounded-xl bg-cyan font-medium text-black transition-all hover:bg-cyan/90 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              {busy ? "Verifying…" : "Authorize Access"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="text-center">
              <span className="text-[11px] text-muted-foreground">
                Configured via <code className="text-white/80">JARVIS_PIN</code> in your .env
              </span>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Open personal access is enabled. Click below to initialize the interface.
            </p>
            <Button
              onClick={() => done()}
              className="h-12 w-full rounded-xl bg-cyan font-medium text-black hover:bg-cyan/90 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              Enter Jarvis Interface
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="mt-8 border-t border-white/5 pt-4 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan" />
            100% Self-Hosted & Local • Complete System Control
          </p>
        </div>
      </div>
    </div>
  );
}
