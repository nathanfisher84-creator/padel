"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One-time banner for coaches who haven't accepted the current Coach
 * Agreement (accounts created before it existed, or before its latest
 * version). New signups accept during registration and never see this.
 */
export function CoachAgreementPrompt() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/agreement", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong — please try again.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-court-300 bg-court-50 px-5 py-4 text-sm text-court-900">
      <p className="font-semibold">Please review our Coach Agreement</p>
      <p className="mt-1">
        We&apos;ve introduced a short, plain-language agreement for all coaches
        — it covers how you get paid (you keep 80%), your response-time
        commitment, and keeping coaching on the platform. It takes two minutes
        to read.
      </p>
      <label className="mt-3 flex items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-court-600"
        />
        <span>
          I have read and agree to the{" "}
          <Link
            href="/coach-terms"
            target="_blank"
            className="font-semibold text-court-700 underline"
          >
            Coach Agreement
          </Link>
          .
        </span>
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        onClick={accept}
        disabled={!checked || busy}
        className="btn-primary mt-3 !px-4 !py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Saving…" : "Accept and continue"}
      </button>
    </div>
  );
}
