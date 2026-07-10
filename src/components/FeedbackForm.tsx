"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function FeedbackForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/videos/${submissionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: form.get("content") }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save feedback.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <h2 className="font-semibold">Write your feedback</h2>
        <p className="mt-1 text-sm text-slate-500">
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
        placeholder="What's working well, what to improve, and specific drills to practise…"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Send feedback to player"}
      </button>
    </form>
  );
}
