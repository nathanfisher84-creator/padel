"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { FOCUS_SHOTS } from "@/lib/constants";
import { VIDEO_RETENTION_DAYS } from "@/lib/storage";

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
        focusShots: form.getAll("focusShots").map(String),
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
      <fieldset>
        <legend className="label">Which shots should the coach focus on?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FOCUS_SHOTS.map((shot) => (
            <label
              key={shot.key}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 has-[:checked]:border-court-500 has-[:checked]:bg-court-50"
            >
              <input
                type="checkbox"
                name="focusShots"
                value={shot.key}
                className="h-4 w-4 rounded border-slate-300"
              />
              {shot.label}
            </label>
          ))}
        </div>
      </fieldset>
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
      <div className="rounded-lg border border-bone-200 bg-cream-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">How to film for the best feedback</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Film from behind the court, high enough to see both your feet and the ball</li>
          <li>Landscape, steady phone — a fence post or tripod beats a shaky hand</li>
          <li>
            Film at <span className="font-semibold">1080p, not 4K</span> — the feedback is
            identical and your upload is ~4× faster (a full match fits in 1 GB)
          </li>
          <li>For shot analysis: 1–2 minutes of repetitions; for tactics: 10–20 minutes of match play</li>
          <li>Make sure you are identifiable (say your shirt colour in the notes)</li>
        </ul>
      </div>
      <div>
        <label className="label" htmlFor="video">Video file (MP4, MOV, WEBM — max 1 GB)</label>
        <input
          className="input"
          id="video"
          name="video"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          required
        />
        <p className="mt-2 text-xs text-slate-500">
          Heads up: the video file is deleted {VIDEO_RETENTION_DAYS} days after
          your feedback is delivered. Your written feedback and timestamped
          notes are kept forever — keep your own copy of the footage if you
          want it long-term.
        </p>
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
