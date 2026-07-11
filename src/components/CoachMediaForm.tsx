"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { PhotoCapture } from "@/components/PhotoCapture";
import { IntroVideoInput } from "@/components/IntroVideoInput";

/** Photo + intro video management for a coach's existing profile. */
export function CoachMediaForm({
  photoUrl,
  introVideoUrl,
  useBlobStorage,
}: {
  photoUrl: string | null;
  introVideoUrl: string | null;
  useBlobStorage: boolean;
}) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!photo && !video) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (photo) {
        setStatus("Uploading photo…");
        const form = new FormData();
        form.append("photo", photo);
        const res = await fetch("/api/coach/media", { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Photo upload failed.");
        }
        setPhoto(null);
      }
      if (video) {
        setStatus("Uploading intro video…");
        if (useBlobStorage) {
          const blob = await upload(video.name, video, {
            access: "public",
            handleUploadUrl: "/api/videos/upload-token",
            clientPayload: JSON.stringify({ kind: "coach-intro" }),
            onUploadProgress: ({ percentage }) =>
              setStatus(`Uploading intro video… ${Math.round(percentage)}%`),
          });
          const res = await fetch("/api/coach/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ introVideoUrl: blob.url }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Video upload failed.");
          }
        } else {
          const form = new FormData();
          form.append("video", video);
          const res = await fetch("/api/coach/media", { method: "POST", body: form });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Video upload failed.");
          }
        }
        setVideo(null);
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="card mt-6 space-y-4">
      <p className="text-sm font-semibold text-slate-700">Profile media</p>
      <div>
        <span className="label">Profile photo</span>
        <PhotoCapture onChange={setPhoto} initialUrl={photoUrl} />
      </div>
      <div>
        <span className="label">Intro video</span>
        <IntroVideoInput onChange={setVideo} initialUrl={introVideoUrl} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && (
        <p className="text-sm font-medium text-court-700">Profile media saved.</p>
      )}
      <button
        type="button"
        className="btn-primary"
        onClick={save}
        disabled={busy || (!photo && !video)}
      >
        {busy ? status ?? "Saving…" : "Save media"}
      </button>
    </div>
  );
}
