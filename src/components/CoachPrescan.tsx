"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { id: string; timeSeconds: number; note: string };
type Prescan = { inventory: string; level: string; suggestions: Suggestion[] };

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * The coach's AI co-pilot: an on-demand pre-scan of the submission (private
 * inventory + level estimate + draft timestamped notes). Every suggestion is
 * accepted, edited or dismissed by the coach — nothing reaches the player
 * without a coach decision. Timestamps seek the AnalysisPlayer above via a
 * window event.
 */
export function CoachPrescan({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [prescan, setPrescan] = useState<Prescan | null>(() => {
    try {
      return initial ? (JSON.parse(initial) as Prescan) : null;
    } catch {
      return null;
    }
  });
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${submissionId}/prescan`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The pre-scan failed. Please retry.");
      setPrescan(data.prescan as Prescan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The pre-scan failed. Please retry.");
    } finally {
      setRunning(false);
    }
  }

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/videos/${submissionId}/prescan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update the pre-scan.");
      setPrescan(data.prescan as Prescan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the pre-scan.");
    } finally {
      setBusyId(null);
    }
  }

  async function accept(s: Suggestion) {
    const body = (edits[s.id] ?? s.note).trim();
    if (!body) return;
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSeconds: s.timeSeconds, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not add the note.");
      await dismiss(s.id); // consumed — remove from the stored pre-scan
      router.refresh(); // the AnalysisPlayer re-reads its notes from the server
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the note.");
      setBusyId(null);
    }
  }

  function seekTo(t: number) {
    window.dispatchEvent(new CustomEvent("analysis:seek", { detail: t }));
  }

  if (!prescan) {
    return (
      <div className="card border-court-200 !py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-court-800">✨ AI pre-scan (private)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Let the AI watch the video first: you get a rally-by-rally
              inventory, a level estimate and draft timestamped notes to
              accept, edit or discard. The player never sees any of it unless
              you accept it.
            </p>
          </div>
          <button
            onClick={run}
            disabled={running}
            className="btn-primary shrink-0 !px-4 !py-2 text-sm"
          >
            {running ? "Scanning… (1–3 min)" : "Run pre-scan"}
          </button>
        </div>
        {running && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-court-600 border-t-transparent"
            />
            Watching the full video — keep this page open.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card border-court-200 !py-4">
      <h2 className="font-semibold text-court-800">
        ✨ AI pre-scan{" "}
        <span className="badge ml-1 bg-court-100 text-court-800">
          level: {prescan.level}
        </span>
        <span className="ml-2 text-xs font-normal text-slate-500">
          private to you — the player sees only what you accept
        </span>
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
        {prescan.inventory}
      </p>

      {prescan.suggestions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Suggested notes — accept, edit or dismiss
          </p>
          {prescan.suggestions.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-dashed border-court-300 bg-court-50/50 p-3"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => seekTo(s.timeSeconds)}
                  className="mt-0.5 shrink-0 rounded bg-court-100 px-2 py-1 font-mono text-xs font-semibold text-court-800 hover:bg-court-200"
                  aria-label={`Jump to ${fmt(s.timeSeconds)}`}
                >
                  {fmt(s.timeSeconds)}
                </button>
                <textarea
                  className="input flex-1 !py-1.5 text-sm"
                  rows={2}
                  maxLength={1000}
                  value={edits[s.id] ?? s.note}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => dismiss(s.id)}
                  disabled={busyId === s.id}
                  className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => accept(s)}
                  disabled={busyId === s.id || !(edits[s.id] ?? s.note).trim()}
                  className="btn-primary !px-3 !py-1 text-xs"
                >
                  {busyId === s.id ? "…" : "Accept as my note"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          All suggestions handled — pinned notes appear in your list above.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
