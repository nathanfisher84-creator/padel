"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnalysisComment = {
  id: string;
  timeSeconds: number;
  body: string;
  drawing?: string | null;
};

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const FRAME = 1 / 30; // one frame at 30fps — good enough for scrubbing

// Telestration shapes, in coordinates normalised to 0-1 of the video box so
// a drawing made on a laptop replays identically on a phone.
type Tool = "pen" | "line" | "arrow" | "circle";
type Shape = { tool: Tool; color: string; points: [number, number][] };

const TOOLS: { key: Tool; label: string; hint: string }[] = [
  { key: "pen", label: "✎ Pen", hint: "Freehand" },
  { key: "line", label: "╱ Line", hint: "Straight line" },
  { key: "arrow", label: "→ Arrow", hint: "Direction arrow" },
  { key: "circle", label: "◯ Circle", hint: "Circle a player or zone" },
];
const COLORS = ["#facc15", "#ef4444", "#3b82f6", "#ffffff"];

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseDrawing(raw: string | null | undefined): Shape[] | null {
  if (!raw) return null;
  try {
    const shapes = JSON.parse(raw) as Shape[];
    return Array.isArray(shapes) && shapes.length ? shapes : null;
  } catch {
    return null;
  }
}

/** Render a set of shapes onto the overlay canvas. */
function drawShapes(canvas: HTMLCanvasElement, shapes: Shape[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const lineWidth = Math.max(2.5, w * 0.004);
  for (const s of shapes) {
    if (!s.points.length) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = s.points.map(([x, y]) => [x * w, y * h] as const);
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[pts.length - 1];
    ctx.beginPath();
    if (s.tool === "pen") {
      ctx.moveTo(x0, y0);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    } else if (s.tool === "line" || s.tool === "arrow") {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      if (s.tool === "arrow") {
        const angle = Math.atan2(y1 - y0, x1 - x0);
        const head = Math.max(10, w * 0.02);
        for (const side of [-1, 1]) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(
            x1 - head * Math.cos(angle + (side * Math.PI) / 7),
            y1 - head * Math.sin(angle + (side * Math.PI) / 7)
          );
        }
      }
    } else {
      // circle: ellipse inside the drag's bounding box
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.max(Math.abs(x1 - x0) / 2, lineWidth);
      const ry = Math.max(Math.abs(y1 - y0) / 2, lineWidth);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
}

/**
 * The coach's analysis workspace and the player's review viewer, in one.
 *
 * On top of a native <video>: playback speed, single-frame stepping, an A–B
 * loop, keyboard shortcuts, timestamped notes — and a telestration layer.
 * When `editable`, the coach can pause on a frame, draw (pen / line / arrow /
 * circle in four colours) and pin the drawing to a note. The player clicks a
 * note's timestamp and sees the frozen frame with the coach's drawing.
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [comments, setComments] = useState<AnalysisComment[]>(() =>
    [...initialComments].sort((a, b) => a.timeSeconds - b.timeSeconds)
  );
  // The server re-sends comments after a router.refresh() (e.g. once the AI
  // coach finishes its instant review). State initializers only run on first
  // mount, so sync explicitly — the server is authoritative after a refresh.
  useEffect(() => {
    setComments([...initialComments].sort((a, b) => a.timeSeconds - b.timeSeconds));
  }, [initialComments]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telestration state. `shapes` is the coach's in-progress drawing (attached
  // to the next saved note); `viewShapes` is a saved drawing being replayed.
  const [drawMode, setDrawMode] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [viewShapes, setViewShapes] = useState<Shape[] | null>(null);
  const inProgress = useRef<Shape | null>(null);

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

  // ---- canvas plumbing -----------------------------------------------------

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = drawMode
      ? [...shapes, ...(inProgress.current ? [inProgress.current] : [])]
      : viewShapes ?? [];
    drawShapes(canvas, active);
  }, [drawMode, shapes, viewShapes]);

  // Keep the canvas buffer matched to the video's on-screen size.
  useEffect(() => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;
    const sync = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(v.clientWidth * dpr);
      canvas.height = Math.round(v.clientHeight * dpr);
      repaint();
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(v);
    return () => ro.disconnect();
  }, [repaint]);

  useEffect(repaint, [repaint]);

  // A saved drawing belongs to its paused frame — clear it when play resumes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setViewShapes(null);
    v.addEventListener("play", onPlay);
    return () => v.removeEventListener("play", onPlay);
  }, []);

  // Companion panels (e.g. the coach's AI pre-scan) seek the player by
  // dispatching a window event with the target time in seconds.
  useEffect(() => {
    const onSeek = (e: Event) => {
      const t = (e as CustomEvent<number>).detail;
      if (!Number.isFinite(t)) return;
      seek(t);
      videoRef.current?.pause();
    };
    window.addEventListener("analysis:seek", onSeek);
    return () => window.removeEventListener("analysis:seek", onSeek);
  }, [seek]);

  function canvasPoint(e: React.PointerEvent): [number, number] {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return [x, y];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!drawMode) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    videoRef.current?.pause();
    inProgress.current = { tool, color, points: [canvasPoint(e)] };
    repaint();
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = inProgress.current;
    if (!drawMode || !s) return;
    e.preventDefault();
    const p = canvasPoint(e);
    if (s.tool === "pen") {
      const last = s.points[s.points.length - 1];
      // Skip micro-movements so freehand paths stay small.
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.004) s.points.push(p);
      if (s.points.length > 780) s.points.splice(1, s.points.length - 780);
    } else {
      s.points = [s.points[0], p];
    }
    repaint();
  }

  function onPointerUp() {
    const s = inProgress.current;
    if (!drawMode || !s) return;
    inProgress.current = null;
    // Discard accidental taps that drew nothing visible.
    const [x0, y0] = s.points[0];
    const [x1, y1] = s.points[s.points.length - 1];
    const moved = s.points.length > 2 || Math.hypot(x1 - x0, y1 - y0) > 0.008;
    if (moved) setShapes((prev) => [...prev, s]);
    repaint();
  }

  function enterDrawMode() {
    videoRef.current?.pause();
    setViewShapes(null);
    setDrawMode(true);
  }

  // ---- existing player behaviour -------------------------------------------

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
        body: JSON.stringify({
          timeSeconds: at,
          body,
          ...(shapes.length ? { drawing: JSON.stringify(shapes) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the note.");
      setComments((prev) =>
        [...prev, data.comment as AnalysisComment].sort(
          (a, b) => a.timeSeconds - b.timeSeconds
        )
      );
      setNote("");
      setShapes([]);
      setDrawMode(false);
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

  function showComment(c: AnalysisComment) {
    const saved = parseDrawing(c.drawing);
    seek(c.timeSeconds);
    if (saved) {
      // A drawing belongs to its frame: pause there and overlay it.
      videoRef.current?.pause();
      setDrawMode(false);
      setViewShapes(saved);
    } else {
      setViewShapes(null);
      videoRef.current?.play().catch(() => {});
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <video
          ref={videoRef}
          controls
          preload="metadata"
          onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
          className="aspect-video w-full rounded-xl border border-slate-200 bg-black"
          src={src}
        />
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`absolute inset-0 h-full w-full rounded-xl ${
            drawMode
              ? "cursor-crosshair touch-none ring-2 ring-inset ring-ball-500"
              : "pointer-events-none"
          }`}
          aria-label={drawMode ? "Drawing layer — drag to draw on the frame" : undefined}
        />
        {viewShapes && (
          <button
            type="button"
            onClick={() => setViewShapes(null)}
            className="absolute right-3 top-3 rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black/85"
          >
            Hide drawing ✕
          </button>
        )}
      </div>

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

        {editable && (
          <button
            type="button"
            onClick={() => (drawMode ? setDrawMode(false) : enterDrawMode())}
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              drawMode
                ? "bg-ball-500 text-court-950"
                : "bg-court-700 text-white hover:bg-court-800"
            }`}
          >
            {drawMode ? "✓ Done drawing" : "✎ Draw on frame"}
          </button>
        )}

        <span className="ml-auto hidden text-xs text-slate-400 sm:inline">
          Space play · ←/→ 5s · Shift+←/→ frame · J/L 10s
        </span>
      </div>

      {/* Telestration toolbar */}
      {editable && drawMode && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-ball-500/50 bg-ball-500/10 px-3 py-2 text-sm">
          <div className="flex items-center gap-1">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                type="button"
                title={t.hint}
                onClick={() => setTool(t.key)}
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  tool === t.key
                    ? "bg-court-700 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Draw in ${c}`}
                className={`h-5 w-5 rounded-full border ${
                  color === c
                    ? "border-court-900 ring-2 ring-court-400"
                    : "border-slate-300"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShapes((s) => s.slice(0, -1))}
              disabled={!shapes.length}
              className="rounded px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setShapes([])}
              disabled={!shapes.length}
              className="rounded px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <span className="ml-auto text-xs text-slate-600">
            Drag on the video to draw — your drawing attaches to the next note
            you pin.
          </span>
        </div>
      )}

      {/* Coach note composer */}
      {editable && (
        <div className="rounded-lg border border-court-200 bg-court-50 p-3">
          <label
            htmlFor="analysis-note"
            className="text-xs font-semibold text-court-800"
          >
            Pin a note at {fmt(current)}
            {shapes.length > 0 && (
              <span className="ml-2 rounded bg-ball-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-ball-600">
                ✎ drawing attached ({shapes.length} shape{shapes.length === 1 ? "" : "s"})
              </span>
            )}
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
            timestamp. Use ✎ Draw on frame to circle players or sketch arrows;
            the drawing saves with the note. Contact details are removed
            automatically.
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
                onClick={() => showComment(c)}
                className="mt-0.5 shrink-0 rounded bg-court-100 px-2 py-1 font-mono text-xs font-semibold text-court-800 hover:bg-court-200"
                aria-label={`Jump to ${fmt(c.timeSeconds)}${c.drawing ? " and show the drawing" : ""}`}
              >
                {fmt(c.timeSeconds)}
                {c.drawing ? " ✎" : ""}
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
