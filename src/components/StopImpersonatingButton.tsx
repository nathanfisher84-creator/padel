"use client";

import { useState } from "react";

/** Ends an admin "view as" session and returns to the admin's own account. */
export function StopImpersonatingButton() {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const res = await fetch("/api/admin/stop-impersonating", { method: "POST" });
    if (res.ok) {
      window.location.assign("/dashboard");
    } else {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="shrink-0 rounded-md bg-court-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-court-800 disabled:opacity-60"
    >
      {busy ? "Returning…" : "Return to admin"}
    </button>
  );
}
