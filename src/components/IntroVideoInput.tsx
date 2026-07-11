"use client";

import { useRef, useState } from "react";
import { MAX_INTRO_SECONDS, MAX_VIDEO_BYTES } from "@/lib/storage";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Intro video picker with a 5-minute cap, enforced in the browser by
 * reading the file's duration before it is accepted.
 */
export function IntroVideoInput({
  onChange,
  initialUrl,
}: {
  onChange: (file: File | null) => void;
  initialUrl?: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState<string | null>(
    initialUrl ? "Current video on your profile" : null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("That file isn't a video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Video must be under 500 MB.");
      return;
    }
    let duration: number;
    try {
      duration = await readDuration(file);
    } catch {
      setError("Couldn't read that video — try a different file.");
      return;
    }
    if (duration > MAX_INTRO_SECONDS + 1) {
      setError(
        `Your video is ${fmt(duration)} — the maximum is ${fmt(MAX_INTRO_SECONDS)}. Trim it and try again.`
      );
      if (input.current) input.current.value = "";
      onChange(null);
      setLabel(null);
      return;
    }
    onChange(file);
    setLabel(`${file.name} · ${fmt(duration)}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-secondary !px-4 !py-2 text-sm"
          onClick={() => input.current?.click()}
        >
          {label && !label.startsWith("Current") ? "Change video" : "Upload a video"}
        </button>
        {label && <span className="stat text-xs text-slate-500">{label}</span>}
      </div>
      <input
        ref={input}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="mt-2 text-xs text-slate-500">
        Optional · up to {fmt(MAX_INTRO_SECONDS)} · introduce yourself and your
        coaching style to players.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(video.duration)) resolve(video.duration);
      else reject();
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };
    video.src = url;
  });
}
