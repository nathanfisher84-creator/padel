"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Profile photo picker: take a selfie with the device camera (front camera
 * on phones via capture="user") or choose an existing picture. The image is
 * downscaled to 800px JPEG in the browser so it uploads fast and always
 * fits the photo size limit.
 */
export function PhotoCapture({
  onChange,
  initialUrl,
}: {
  onChange: (file: File | null) => void;
  initialUrl?: string | null;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(file: File | undefined | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image — choose a photo.");
      return;
    }
    try {
      const resized = await downscale(file);
      onChange(resized);
      setPreview((old) => {
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
        return URL.createObjectURL(resized);
      });
    } catch {
      setError("Couldn't read that image — try a different photo.");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? (
          <img
            src={preview}
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
          >
            Take a selfie
          </button>
          <button
            type="button"
            className="btn-secondary !px-4 !py-2 text-sm"
            onClick={() => fileInput.current?.click()}
          >
            Choose a photo
          </button>
        </div>
      </div>
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
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
