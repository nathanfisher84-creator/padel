"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin toggle for the founding-coach programme: badge + promotional
 * platform fee. Rendered next to each human coach in the admin dashboard.
 */
export function FoundingCoachButton({
  userId,
  isFounding,
}: {
  userId: string;
  isFounding: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/founding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, founding: !isFounding }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Update failed.");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={
        isFounding
          ? "Remove founding status (restores the standard platform fee)"
          : "Mark as founding coach (badge + promotional platform fee)"
      }
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
        isFounding
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700"
      }`}
    >
      {busy ? "…" : isFounding ? "★ Founding" : "Make founding"}
    </button>
  );
}
