"use client";

import { useState } from "react";

/** Admin "view as" button: starts impersonating the given user, then reloads
 *  into their dashboard. */
export function ViewAsButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
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
      className="btn-secondary !px-3 !py-1.5 text-xs"
    >
      {busy ? "Opening…" : "View as"}
    </button>
  );
}
