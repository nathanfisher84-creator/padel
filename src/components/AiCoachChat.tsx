"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I'm a total beginner — where do I start?",
  "When should I lob in padel?",
  "How do I hit a bandeja?",
  "Where should my partner and I stand?",
];

const GREETING =
  "Hi, I'm Nova 👋 your AI padel coach. Ask me anything about technique, tactics, positioning or drills — or upload a short clip and I'll break it down. What do you want to work on?";

export function AiCoachChat({
  loggedIn,
  enabled,
}: {
  loggedIn: boolean;
  enabled: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    if (!loggedIn) {
      router.push("/login?next=/ai-coach");
      return;
    }
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Nova couldn't respond.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nova couldn't respond.");
      // Drop the optimistic user turn back into the box so it isn't lost.
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex h-[70vh] max-h-[640px] flex-col !p-0">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-5"
        aria-live="polite"
      >
        {/* Greeting */}
        <Bubble role="assistant" text={GREETING} />
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.content} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ball-500" />
            Nova is thinking…
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-court-200 bg-court-50 px-3 py-1.5 text-left text-xs text-court-800 transition hover:bg-court-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="px-5 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-slate-200 p-3"
      >
        <textarea
          className="input flex-1 resize-none"
          rows={1}
          value={input}
          disabled={!enabled}
          placeholder={
            enabled ? "Ask Nova about your padel…" : "The AI coach is coming soon."
          }
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          className="btn-primary shrink-0"
          disabled={busy || !enabled || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-court-700 text-white"
            : "bg-court-50 text-slate-800"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
