"use client";

import { useEffect, useRef, useState } from "react";

export type PlayerRef = {
  /** Tap point, normalised 0-1 of the frame. */
  x: number;
  y: number;
  /** Small JPEG crop of the player around the tap point (data URL). */
  image: string;
};

/**
 * Tap-to-identify: renders the selected video's opening frame and asks the
 * player to tap themselves. Produces a normalised tap point plus a small JPEG
 * crop around it — the reference photo that anchors the AI's player
 * identification (far more reliable than describing clothing).
 *
 * Best-effort by design: if the browser can't decode the video (some codecs),
 * the component reports itself unavailable and the flow continues without it.
 */
export function PlayerTagger({
  file,
  onChange,
}: {
  file: File;
  onChange: (ref: PlayerRef | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLCanvasElement | null>(null); // full-res frame
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  const [mark, setMark] = useState<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<string | null>(null);

  // Decode the opening frame into an offscreen full-res canvas, then paint a
  // scaled copy into the visible one.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMark(null);
    setCrop(null);
    onChange(null);

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    const fail = () => {
      if (!cancelled) setStatus("unavailable");
      URL.revokeObjectURL(url);
    };
    // Codec the browser can't decode (or a stalled load) must not hang the
    // form — give up quietly and let the written description carry it.
    const deadline = setTimeout(fail, 8000);

    video.onloadeddata = () => {
      // Seek slightly in: frame 0 is often black/fading in.
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      if (cancelled) return;
      clearTimeout(deadline);
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return fail();
        const full = document.createElement("canvas");
        full.width = w;
        full.height = h;
        full.getContext("2d")!.drawImage(video, 0, 0, w, h);
        frameRef.current = full;

        const visible = canvasRef.current;
        if (visible) {
          const scale = Math.min(1, 720 / w);
          visible.width = Math.round(w * scale);
          visible.height = Math.round(h * scale);
          visible
            .getContext("2d")!
            .drawImage(full, 0, 0, visible.width, visible.height);
        }
        setStatus("ready");
      } catch {
        fail();
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    video.onerror = fail;

    return () => {
      cancelled = true;
      clearTimeout(deadline);
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function repaintMark(x: number, y: number) {
    const visible = canvasRef.current;
    const full = frameRef.current;
    if (!visible || !full) return;
    const ctx = visible.getContext("2d")!;
    ctx.drawImage(full, 0, 0, visible.width, visible.height);
    const px = x * visible.width;
    const py = y * visible.height;
    const r = Math.max(18, visible.width * 0.035);
    ctx.strokeStyle = "#d9b873";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#d9b873";
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function onTap(e: React.MouseEvent<HTMLCanvasElement>) {
    const visible = canvasRef.current;
    const full = frameRef.current;
    if (!visible || !full || status !== "ready") return;
    const rect = visible.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    // Crop a portrait-ish box around the tap from the FULL-RES frame — tall
    // enough to include the whole player, not just where they tapped.
    const cw = Math.round(Math.min(full.width, full.height) * 0.34);
    const ch = Math.round(cw * 1.5);
    const cx = Math.round(
      Math.min(Math.max(x * full.width - cw / 2, 0), full.width - cw)
    );
    const cy = Math.round(
      Math.min(Math.max(y * full.height - ch / 2, 0), full.height - ch)
    );
    const out = document.createElement("canvas");
    const scale = Math.min(1, 360 / cw);
    out.width = Math.round(cw * scale);
    out.height = Math.round(ch * scale);
    out
      .getContext("2d")!
      .drawImage(full, cx, cy, cw, ch, 0, 0, out.width, out.height);
    const image = out.toDataURL("image/jpeg", 0.82);

    setMark({ x, y });
    setCrop(image);
    repaintMark(x, y);
    onChange({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, image });
  }

  if (status === "unavailable") {
    return (
      <p className="mt-2 text-xs text-slate-500">
        Couldn&rsquo;t preview this video in your browser — no problem, your
        written description above will be used to identify you.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-court-200 bg-court-50 p-3">
      <p className="text-xs font-semibold text-court-800">
        Tap yourself in this frame {mark ? "✓" : "(recommended)"}
      </p>
      <p className="mt-0.5 text-xs text-slate-600">
        This gives your reviewer a photo of exactly who you are — the most
        reliable way to make sure the analysis is about you.
      </p>
      <div className="relative mt-2">
        {status === "loading" && (
          <p className="py-6 text-center text-xs text-slate-500">
            Loading the first frame…
          </p>
        )}
        <canvas
          ref={canvasRef}
          onClick={onTap}
          data-testid="player-tagger-canvas"
          className={`w-full cursor-crosshair rounded-lg border border-slate-200 ${
            status === "ready" ? "" : "hidden"
          }`}
        />
      </div>
      {crop && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={crop}
            alt="You, cropped from the video"
            className="h-16 w-auto rounded-md border border-court-300"
          />
          <p className="text-xs text-court-800">
            Got you — this photo goes to your reviewer.{" "}
            <span className="text-slate-500">Tap again to adjust.</span>
          </p>
        </div>
      )}
    </div>
  );
}
