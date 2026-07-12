"use client";

import { useEffect, useRef, useState } from "react";

type Picked = { file: File; url: string };

/**
 * Profile photo picker: take a selfie with the device camera (front camera
 * on phones via capture="user") or choose an existing picture. The image is
 * downscaled to 800px JPEG in the browser so it uploads fast and always fits
 * the photo size limit.
 *
 * When `standardize` is set (coach profiles), the picked photo is sent to the
 * AI standardizer and the coach is shown a before/after to choose from. If the
 * feature is off or fails, the original photo is used with no interruption.
 */
export function PhotoCapture({
  onChange,
  initialUrl,
  standardize = false,
}: {
  onChange: (file: File | null) => void;
  initialUrl?: string | null;
  standardize?: boolean;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [original, setOriginal] = useState<Picked | null>(null);
  const [studio, setStudio] = useState<Picked | null>(null);
  const [chosen, setChosen] = useState<"original" | "studio" | null>(null);
  const [phase, setPhase] = useState<"idle" | "generating" | "choose" | "done">(
    "idle"
  );
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revoke any object URLs we created when they change or on unmount.
  useEffect(() => {
    return () => {
      if (original?.url.startsWith("blob:")) URL.revokeObjectURL(original.url);
      if (studio?.url.startsWith("blob:")) URL.revokeObjectURL(studio.url);
    };
  }, [original, studio]);

  function reset() {
    setStudio(null);
    setChosen(null);
    setNote(null);
    setError(null);
  }

  async function handleFile(file: File | undefined | null) {
    reset();
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image — choose a photo.");
      return;
    }
    let resized: File;
    try {
      resized = await downscale(file);
    } catch {
      setError("Couldn't read that image — try a different photo.");
      return;
    }
    const orig: Picked = { file: resized, url: URL.createObjectURL(resized) };
    setOriginal(orig);

    if (!standardize) {
      onChange(resized);
      setChosen("original");
      setPhase("done");
      return;
    }

    await generateStudio(orig);
  }

  async function generateStudio(orig: Picked) {
    setPhase("generating");
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.append("photo", orig.file);
      const res = await fetch("/api/coach/photo/standardize", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.available && data.image) {
        const studioFile = await downscale(
          dataUrlToFile(data.image, "studio-photo.jpg")
        );
        setStudio({ file: studioFile, url: URL.createObjectURL(studioFile) });
        setPhase("choose");
        return;
      }

      // Feature off, or generation failed — fall back to the original photo.
      if (res.ok && data.available === false) {
        setNote(null);
      } else {
        setNote("Couldn't create a studio version just now — using your photo.");
      }
      onChange(orig.file);
      setChosen("original");
      setPhase("done");
    } catch {
      setNote("Couldn't create a studio version just now — using your photo.");
      onChange(orig.file);
      setChosen("original");
      setPhase("done");
    }
  }

  function choose(which: "original" | "studio") {
    const pick = which === "studio" ? studio : original;
    if (!pick) return;
    onChange(pick.file);
    setChosen(which);
    setPhase("done");
  }

  const shownUrl =
    chosen === "studio"
      ? studio?.url
      : original?.url ?? initialUrl ?? null;

  return (
    <div>
      {/* Compact state: current/selected photo + pick buttons */}
      {phase !== "choose" && (
        <div className="flex items-center gap-4">
          {shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownUrl}
              alt="Profile photo preview"
              className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M4 21c1.2-3.4 4.3-5 8-5s6.8 1.6 8 5" />
              </svg>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary !px-4 !py-2 text-sm"
              onClick={() => cameraInput.current?.click()}
              disabled={phase === "generating"}
            >
              Take a selfie
            </button>
            <button
              type="button"
              className="btn-secondary !px-4 !py-2 text-sm"
              onClick={() => fileInput.current?.click()}
              disabled={phase === "generating"}
            >
              Choose a photo
            </button>
          </div>
        </div>
      )}

      {phase === "generating" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-court-300 border-t-court-700" />
          Creating your studio headshot… this takes a few seconds.
        </p>
      )}

      {/* Choose: original vs studio */}
      {phase === "choose" && original && studio && (
        <div>
          <p className="text-sm font-medium text-slate-700">
            Pick your profile photo
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:max-w-md">
            <Option
              label="Studio version"
              hint="Standardized to match the roster"
              url={studio.url}
              recommended
              onSelect={() => choose("studio")}
            />
            <Option
              label="Your photo"
              hint="Use it exactly as taken"
              url={original.url}
              onSelect={() => choose("original")}
            />
          </div>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-court-700 hover:underline"
            onClick={() => original && generateStudio(original)}
          >
            ↻ Try the studio version again
          </button>
        </div>
      )}

      {phase === "done" && chosen && (
        <p className="mt-2 text-xs text-slate-600">
          Using your {chosen === "studio" ? "studio" : "original"} photo.{" "}
          <button
            type="button"
            className="font-medium text-court-700 hover:underline"
            onClick={() => {
              setPhase("idle");
              cameraInput.current?.click();
            }}
          >
            Change photo
          </button>
        </p>
      )}

      {note && <p className="mt-2 text-xs text-slate-600">{note}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Camera-first input: on phones this opens the front camera. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

function Option({
  label,
  hint,
  url,
  recommended,
  onSelect,
}: {
  label: string;
  hint: string;
  url: string;
  recommended?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-court-400 hover:shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={label}
        className="h-24 w-24 rounded-full border border-slate-200 object-cover"
      />
      <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        {label}
        {recommended && (
          <span className="badge bg-ball-500/20 text-ball-600">Pick</span>
        )}
      </span>
      <span className="text-xs text-slate-600">{hint}</span>
      <span className="btn-primary mt-2 !px-4 !py-1.5 text-xs">Use this</span>
    </button>
  );
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("encode failed");
  return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
}
