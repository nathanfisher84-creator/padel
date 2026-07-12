"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export function FeedbackForm({
  submissionId,
  useBlobStorage,
}: {
  submissionId: string;
  useBlobStorage: boolean;
}) {
  const router = useRouter();
  const videoInput = useRef<HTMLInputElement>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const video = videoInput.current?.files?.[0] ?? null;

    try {
      let res: Response;
      if (video && useBlobStorage) {
        setStatus("Uploading your video reply…");
        const blob = await upload(video.name, video, {
          access: "public",
          handleUploadUrl: "/api/videos/upload-token",
          clientPayload: JSON.stringify({ kind: "feedback" }),
          onUploadProgress: ({ percentage }) =>
            setStatus(`Uploading your video reply… ${Math.round(percentage)}%`),
        });
        setStatus("Sending feedback…");
        res = await fetch(`/api/videos/${submissionId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: form.get("content"), videoUrl: blob.url }),
        });
      } else if (video) {
        setStatus("Uploading…");
        const multipart = new FormData();
        multipart.append("content", String(form.get("content")));
        multipart.append("video", video);
        res = await fetch(`/api/videos/${submissionId}/feedback`, {
          method: "POST",
          body: multipart,
        });
      } else {
        res = await fetch(`/api/videos/${submissionId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: form.get("content") }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save feedback.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback.");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Write your feedback</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cover technique, positioning and tactics — the player will be notified
          once you submit.
        </p>
      </div>
      <textarea
        className="input"
        name="content"
        rows={8}
        required
        minLength={10}
        aria-label="Your feedback"
        placeholder="What's working well, what to improve, and specific drills to practise…"
      />
      <p className="-mt-2 text-xs text-slate-600">
        To keep coaching on PadelPro, contact details (emails, phone numbers,
        links) are automatically removed from feedback.
      </p>
      <div>
        <span className="label">Video reply (optional)</span>
        <p className="mb-2 text-xs text-slate-600">
          Record yourself talking through the analysis — players love it.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary !px-4 !py-2 text-sm"
            onClick={() => videoInput.current?.click()}
          >
            {videoName ? "Change video" : "Attach a video"}
          </button>
          {videoName && (
            <span className="stat text-xs text-slate-600">{videoName}</span>
          )}
        </div>
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setVideoName(e.target.files?.[0]?.name ?? null)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? status ?? "Sending…" : "Send feedback to player"}
      </button>
    </form>
  );
}
