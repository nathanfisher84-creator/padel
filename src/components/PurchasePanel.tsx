"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PurchasePanel({
  coachId,
  loggedIn,
  isPlayer,
}: {
  coachId: string;
  loggedIn: boolean;
  isPlayer: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"one_off" | "monthly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function purchase(plan: "one_off" | "monthly") {
    if (!loggedIn) {
      router.push(`/login?next=/coaches/${coachId}`);
      return;
    }
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.url.startsWith("http")) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        router.push(data.url); // demo mode
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  }

  if (loggedIn && !isPlayer) {
    return (
      <p className="text-center text-sm text-slate-500">
        You are logged in as a coach — only player accounts can purchase coaching.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        className="btn-secondary w-full"
        disabled={busy !== null}
        onClick={() => purchase("one_off")}
      >
        {busy === "one_off" ? "Redirecting…" : "Buy one video review"}
      </button>
      <button
        className="btn-primary w-full"
        disabled={busy !== null}
        onClick={() => purchase("monthly")}
      >
        {busy === "monthly" ? "Redirecting…" : "Subscribe monthly"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loggedIn && (
        <p className="text-center text-xs text-slate-500">
          You&apos;ll be asked to log in or create a free account first.
        </p>
      )}
    </div>
  );
}
