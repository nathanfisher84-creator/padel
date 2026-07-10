"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export function UploadForm({
  coaches,
  useBlobStorage,
}: {
  coaches: { id: string; name: string }[];
  useBlobStorage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = useBlobStorage
        ? await submitViaBlob(form)
        : await fetch("/api/videos", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed. Please try again.");
      router.push(`/submissions/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setBusy(false);
      setProgress(null);
    }
  }

  /** Browser → Blob storage directly, then register the submission. */
  async function submitViaBlob(form: FormData): Promise<Response> {
    const file = form.get("video") as File;
    const coachId = String(form.get("coachId"));
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/videos/upload-token",
      clientPayload: JSON.stringify({ coachId }),
      onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
    });
    setProgress(null);
    return fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachId,
        title: form.get("title"),
        notes: form.get("notes") || undefined,
        videoUrl: blob.url,
      }),
    });
  }

  return (
    <form onSubmit={onSubmit} className="card mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="coachId">Coach</label>
        <select className="input" id="coachId" name="coachId" required>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input
          className="input"
          id="title"
          name="title"
          required
          placeholder="e.g. Doubles match — struggling with bandeja"
        />
      </div>
      <div>
        <label className="label" htmlFor="notes">
          What should the coach focus on? (optional)
        </label>
        <textarea
          className="input"
          id="notes"
          name="notes"
          rows={3}
          placeholder="e.g. My positioning at the net feels off, and my lobs keep landing short…"
        />
      </div>
      <div>
        <label className="label" htmlFor="video">Video file (MP4, MOV, WEBM — max 500 MB)</label>
        <input
          className="input"
          id="video"
          name="video"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy
          ? progress !== null
            ? `Uploading… ${progress}%`
            : "Uploading…"
          : "Send to coach"}
      </button>
    </form>
  );
}
