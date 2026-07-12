"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnalysisComment = {
  id: string;
  timeSeconds: number;
  body: string;
};

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const FRAME = 1 / 30; // one frame at 30fps — good enough for scrubbing

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * The coach's analysis workspace and the player's review viewer, in one.
 *
 * Adds real controls on top of a native <video>: playback speed, single-frame
 * stepping, an A–B loop, and keyboard shortcuts. When `editable`, the coach can
 * pin a note to the current moment; those notes render as a clickable list that
 * seeks the video. The player later sees the same list (read-only) and clicks
 * any timestamp to jump straight there.
 */
export function AnalysisPlayer({
  src,
  submissionId,
  editable,
  initialComments,
}: {
  src: string;
  submissionId: string;
  editable: boolean;
  initialComments: AnalysisComment[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [comments, setComments] = useState<AnalysisComment[]>(() =>
    [...initialComments].sort((a, b) => a.timeSeconds - b.timeSeconds)
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
  }, []);

  const step = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.currentTime + delta, v.duration || 0));
  }, []);

  const setRate = useCallback((r: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    setSpeed(r);
  }, []);

  // Keep the A–B loop honest: when playback runs past B, jump back to A.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrent(v.currentTime);
      if (loopA !== null && loopB !== null && v.currentTime >= loopB) {
        v.currentTime = loopA;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [loopA, loopB]);

  // Keyboard shortcuts — but never while typing in the note box or elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (v.paused) v.play();
          else v.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) step(-FRAME);
          else seek(v.currentTime - 5);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) step(FRAME);
          else seek(v.currentTime + 5);
          break;
        case "j":
          seek(v.currentTime - 10);
          break;
        case "l":
          seek(v.currentTime + 10);
          break;
        case "k":
          if (v.paused) v.play();
          else v.pause();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seek, step]);

  async function addNote() {
    const body = note.trim();
    if (!body) return;
    const at = videoRef.current?.currentTime ?? current;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSeconds: at, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the note.");
      setComments((prev) =>
        [...prev, data.comment as AnalysisComment].sort(
          (a, b) => a.timeSeconds - b.timeSeconds
        )
      );
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNote(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id)); // optimistic
    try {
      const res = await fetch(
        `/api/videos/${submissionId}/comments?commentId=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
    } catch {
      setComments(prev); // roll back on failure
      setError("Could not delete that note.");
    }
  }

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        controls
        preload="metadata"
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
        className="aspect-video w-full rounded-xl border border-slate-200 bg-black"
        src={src}
      />

      {/* Transport toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <span className="font-mono tabular-nums text-slate-700">
          {fmt(current)}
        </span>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Speed</span>
          {SPEEDS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                speed === r
                  ? "bg-court-700 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r}×
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Frame</span>
          <button
            type="button"
            onClick={() => step(-FRAME)}
            className="rounded px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            aria-label="Step back one frame"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => step(FRAME)}
            className="rounded px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            aria-label="Step forward one frame"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Loop</span>
          <button
            type="button"
            onClick={() => setLoopA(videoRef.current?.currentTime ?? current)}
            className="rounded px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Set A{loopA !== null ? ` (${fmt(loopA)})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setLoopB(videoRef.current?.currentTime ?? current)}
            className="rounded px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            Set B{loopB !== null ? ` (${fmt(loopB)})` : ""}
          </button>
          {(loopA !== null || loopB !== null) && (
            <button
              type="button"
              onClick={() => {
                setLoopA(null);
                setLoopB(null);
              }}
              className="rounded px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        <span className="ml-auto hidden text-xs text-slate-400 sm:inline">
          Space play · ←/→ 5s · Shift+←/→ frame · J/L 10s
        </span>
      </div>

      {/* Coach note composer */}
      {editable && (
        <div className="rounded-lg border border-court-200 bg-court-50 p-3">
          <label
            htmlFor="analysis-note"
            className="text-xs font-semibold text-court-800"
          >
            Pin a note at {fmt(current)}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="analysis-note"
              className="input flex-1"
              value={note}
              maxLength={1000}
              placeholder="e.g. Racquet face is closed on the backhand volley…"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
            <button
              type="button"
              className="btn-primary shrink-0 !px-4"
              disabled={busy || !note.trim()}
              onClick={addNote}
            >
              Add note
            </button>
          </div>
          <p className="mt-2 text-xs text-court-700">
            Pause on the moment, then add your note — it pins to the current
            timestamp. Contact details are removed automatically.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Timestamped notes */}
      {comments.length > 0 ? (
        <ol className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <button
                type="button"
                onClick={() => {
                  seek(c.timeSeconds);
                  videoRef.current?.play().catch(() => {});
                }}
                className="mt-0.5 shrink-0 rounded bg-court-100 px-2 py-1 font-mono text-xs font-semibold text-court-800 hover:bg-court-200"
                aria-label={`Jump to ${fmt(c.timeSeconds)}`}
              >
                {fmt(c.timeSeconds)}
              </button>
              <p className="flex-1 whitespace-pre-line text-sm text-slate-700">
                {c.body}
              </p>
              {editable && (
                <button
                  type="button"
                  onClick={() => removeNote(c.id)}
                  className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                  aria-label="Delete note"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        editable && (
          <p className="text-sm text-slate-500">
            No timestamped notes yet. Scrub to a moment and pin your first one.
          </p>
        )
      )}
    </div>
  );
}
