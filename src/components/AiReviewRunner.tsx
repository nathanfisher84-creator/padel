"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "Uploading your video to the AI coach…",
  "Watching your video…",
  "Analysing technique and positioning…",
  "Writing your feedback and pinning timestamped notes…",
];

/**
 * Kicks off the AI review as soon as the player lands on the submission page
 * and shows progress until the feedback is delivered, then refreshes the
 * page so the review renders. The API call is idempotent, so a reload while
 * the analysis runs is harmless.
 */
export function AiReviewRunner({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    setStage(0);
    const ticker = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      12000
    );
    try {
      const res = await fetch(`/api/videos/${submissionId}/ai-review`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "The AI coach hit a problem. Please retry.");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The AI coach hit a problem. Please retry."
      );
    } finally {
      clearInterval(ticker);
    }
  }, [submissionId, router]);

  useEffect(() => {
    // React strict-mode double-mounts effects in dev; only fire once.
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  if (error) {
    return (
      <div className="card border-amber-300 bg-amber-50">
        <h2 className="font-semibold text-amber-800">AI analysis paused</h2>
        <p className="mt-2 text-sm text-amber-800">{error}</p>
        <button onClick={run} className="btn-primary mt-4">
          Retry analysis
        </button>
      </div>
    );
  }

  return (
    <div className="card border-court-300 bg-court-50/60" aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-court-600 border-t-transparent"
        />
        <h2 className="font-semibold text-court-800">
          Your AI review is being generated
        </h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">{STAGES[stage]}</p>
      <p className="mt-3 text-xs text-slate-500">
        This usually takes 1–3 minutes for a full match video. Keep this page
        open — your feedback will appear here automatically.
      </p>
    </div>
  );
}
