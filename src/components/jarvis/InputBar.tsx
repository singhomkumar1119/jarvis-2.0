import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  FileText,
  Image as ImageIcon,
  ListPlus,
  Mic,
  MonitorUp,
  Paperclip,
  Plus,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJarvis, type Attachment } from "@/lib/jarvis-store";
import { toast } from "sonner";
import { uploadTrackedFile } from "@/lib/tracking";
import { ModelPickerMenu, ModelPickerPill } from "./ModelPicker";

const MENU = [
  { key: "file", label: "Add file", icon: Paperclip },
  { key: "photo", label: "Add photo", icon: ImageIcon },
  { key: "camera", label: "Take a photo", icon: Camera },
  { key: "document", label: "Upload document", icon: FileText },
  { key: "screen", label: "Share screen", icon: MonitorUp },
  { key: "task", label: "Create task", icon: ListPlus },
] as const;

export function InputBar({ channel }: { channel: "chat" | "terminal" }) {
  const { send, activity, toggleListening, transcript, stop, addTask, permissions, requestPermission } =
    useJarvis();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen && !modelOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setModelOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen, modelOpen]);

  const MAX_INLINE_BYTES = 8 * 1024 * 1024;

  const readDataUrl = (file: File) =>
    new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });

  const attach = (files: FileList | null, kind: Attachment["kind"]) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setPending((p) => [
      ...p,
      ...list.map((f) => ({ id: `${f.name}-${f.size}`, name: f.name, kind, mediaType: f.type })),
    ]);
    void Promise.all(list.map((f) => uploadTrackedFile(f, kind)));
    list.forEach(async (f) => {
      if (f.size > MAX_INLINE_BYTES) {
        toast(`${f.name} is too large for Jarvis to read`, { description: "Attach files under 8 MB." });
        return;
      }
      const dataUrl = await readDataUrl(f);
      if (!dataUrl) return;
      setPending((p) =>
        p.map((a) => (a.id === `${f.name}-${f.size}` ? { ...a, dataUrl, mediaType: f.type } : a)),
      );
    });
  };

  const handleMenu = (key: (typeof MENU)[number]["key"]) => {
    setMenuOpen(false);
    if (key === "file") fileRef.current?.click();
    if (key === "photo") imageRef.current?.click();
    if (key === "camera") {
      if (permissions.camera !== "granted") {
        requestPermission("camera");
        toast("Camera access granted for this session");
      }
      cameraRef.current?.click();
    }
    if (key === "document") fileRef.current?.click();
    if (key === "screen") toast("Screen sharing isn't connected yet", { description: "Simulated in this preview." });
    if (key === "task") {
      addTask(value.trim() || "New task from Jarvis");
      setValue("");
      toast("Task created");
    }
  };

  const submit = () => {
    if (!value.trim() && !pending.length) return;
    send(value, channel, pending.length ? pending : undefined);
    setValue("");
    setPending([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const busy = activity === "thinking" || activity === "speaking";
  const listening = activity === "listening";

  return (
    <div
      ref={wrapRef}
      className="jarvis-composer pointer-events-auto fixed left-1/2 z-40 -translate-x-1/2"
    >
      {/* Plus action menu — morphs out of the plus button */}
      <div
        className={cn(
          "glass absolute bottom-[calc(100%+0.6rem)] left-0 w-60 origin-bottom-left overflow-hidden rounded-3xl p-1.5 transition-all duration-300 z-50",
          menuOpen
            ? "pointer-events-auto scale-100 opacity-100 blur-0"
            : "pointer-events-none scale-75 opacity-0 blur-sm",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
        role="menu"
        aria-hidden={!menuOpen}
      >
        {MENU.map(({ key, label, icon: Icon }, i) => (
          <button
            key={key}
            role="menuitem"
            onClick={() => handleMenu(key)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground"
            style={{ transitionDelay: menuOpen ? `${i * 22}ms` : "0ms" }}
          >
            <Icon className="h-4 w-4 text-cyan" />
            {label}
          </button>
        ))}
      </div>

      {/* Model Selection Dropdown Menu — positioned above composer */}
      <ModelPickerMenu open={modelOpen} onClose={() => setModelOpen(false)} />

      {pending.length > 0 && (
        <div className="mb-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {pending.map((a) => (
            <button
              key={a.id}
              onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))}
              className="glass-soft max-w-full truncate rounded-full px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {a.name} ✕
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div
        className={cn(
          "glass glass-sheen flex flex-col rounded-[1.75rem] p-3 transition-all duration-300 border border-white/10 shadow-2xl backdrop-blur-2xl",
          focused && "focus-glow ring-1 ring-[--color-electric]/30",
        )}
      >
        {/* Row 1: Textarea with exact user requested placeholder */}
        <textarea
          ref={textareaRef}
          rows={1}
          aria-label={channel === "terminal" ? "Terminal command for Jarvis" : "Message Jarvis"}
          value={listening && transcript ? transcript : value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            channel === "terminal"
              ? "jarvis > run a command, @ to mention, / for actions"
              : "Ask anything, @ to mention, / for actions"
          }
          className={cn(
            "w-full min-w-0 resize-none bg-transparent px-1.5 pt-0.5 pb-2 text-[15px] sm:text-sm text-foreground outline-none placeholder:text-muted-foreground/60 leading-relaxed max-h-44",
            channel === "terminal" && "font-mono sm:text-[13px]",
          )}
        />

        {/* Row 2: Bottom Toolbar with Plus, Model Selector Pill, Mic and Send */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] mt-0.5">
          {/* Left: [+] and Model Picker Pill */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((o) => !o);
                setModelOpen(false);
              }}
              aria-label="Attachments and actions"
              aria-expanded={menuOpen}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-muted-foreground/80 transition-all duration-200 hover:text-foreground hover:bg-white/5 active:scale-90",
                menuOpen && "bg-white/10 text-foreground rotate-[135deg]",
              )}
            >
              <Plus className="h-4 w-4 transition-transform duration-300" />
            </button>

            <ModelPickerPill
              open={modelOpen}
              onClick={() => {
                setModelOpen((o) => !o);
                setMenuOpen(false);
              }}
            />
          </div>

          {/* Right: Voice Mic & Submit / Stop button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleListening(channel)}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-all duration-200 active:scale-90",
                listening
                  ? "bg-primary text-primary-foreground shadow-[0_0_25px_-2px_var(--electric)]"
                  : "hover:text-foreground hover:bg-white/5",
              )}
            >
              <Mic className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={busy ? stop : submit}
              aria-label={busy ? "Stop generating" : "Send message"}
              disabled={!busy && !value.trim() && !pending.length}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full transition-all duration-200 active:scale-90",
                busy
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : value.trim() || pending.length
                    ? "bg-foreground text-background hover:opacity-90 shadow-md"
                    : "bg-white/5 text-muted-foreground/40 cursor-not-allowed",
              )}
            >
              {busy ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" multiple hidden onChange={(e) => attach(e.target.files, "file")} />
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => attach(e.target.files, "image")}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => attach(e.target.files, "image")}
      />
    </div>
  );
}
