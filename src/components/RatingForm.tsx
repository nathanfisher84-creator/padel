"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Star-rating form a player sees once their feedback has arrived. */
export function RatingForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/videos/${submissionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment || undefined }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save your rating.");
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-semibold">How was this review?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your rating is shown on the coach&apos;s profile and helps other
          players choose.
        </p>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-3xl leading-none transition ${
              (hover || rating) >= n ? "text-ball-600" : "text-slate-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={2}
        maxLength={1000}
        aria-label="Comment (optional)"
        placeholder="Anything other players should know? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" onClick={submit} disabled={busy}>
        {busy ? "Saving…" : "Submit rating"}
      </button>
    </div>
  );
}
