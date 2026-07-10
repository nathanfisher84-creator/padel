"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm({
  coaches,
}: {
  coaches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/videos", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/submissions/${data.id}`);
      router.refresh();
    } else {
      setError(data.error ?? "Upload failed. Please try again.");
      setBusy(false);
    }
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
        {busy ? "Uploading…" : "Send to coach"}
      </button>
    </form>
  );
}
