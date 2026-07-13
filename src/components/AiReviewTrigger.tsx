"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Kicks off Nova's instant review of an AI-coach submission that doesn't have
 * feedback yet, then refreshes the page to show it. Auto-runs once on mount;
 * offers a manual retry if it fails.
 */
export function AiReviewTrigger({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState<"working" | "error">("working");

  async function run() {
    setStatus("working");
    try {
      const res = await fetch(`/api/videos/${submissionId}/ai-review`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card border-ball-500/40 bg-ball-500/5 text-center">
      {status === "working" ? (
        <div className="flex items-center justify-center gap-3 py-2 text-slate-700">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-ball-500" />
          <span>Nova is analysing your clip…</span>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-600">
            Nova couldn&rsquo;t finish the analysis just now.
          </p>
          <button className="btn-primary" onClick={run}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
