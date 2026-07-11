"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveCoachButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, publish: true }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not approve.");
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button className="btn-primary !px-4 !py-2 text-sm" onClick={approve} disabled={busy}>
        {busy ? "Approving…" : "Approve & publish"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
