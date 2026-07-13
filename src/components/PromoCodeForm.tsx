"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Redeem a promo code for a free AI video review, then refresh the page. */
export function PromoCodeForm({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    if (!loggedIn) {
      router.push("/login?next=/ai-coach");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "That code didn't work.");
      setMessage({ ok: true, text: "Code applied — you have a free AI review!" });
      router.refresh();
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "That code didn't work.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={redeem} className="mt-3 border-t border-slate-200 pt-3">
      <label htmlFor="promo-code" className="text-xs font-semibold text-slate-600">
        Have a promo code?
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="promo-code"
          className="input flex-1 uppercase"
          value={code}
          maxLength={40}
          placeholder="Enter code"
          autoComplete="off"
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          className="btn-secondary shrink-0 !px-4"
          disabled={busy || !code.trim()}
        >
          {busy ? "…" : "Apply"}
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 text-xs ${message.ok ? "text-court-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
