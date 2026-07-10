"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"PLAYER" | "COACH">(
    params.get("role") === "coach" ? "COACH" : "PLAYER"
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      role,
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };
    if (role === "COACH") {
      body.headline = form.get("headline");
      body.bio = form.get("bio");
      body.location = form.get("location");
      body.experienceYears = form.get("experienceYears") || 0;
      body.oneOffPrice = form.get("oneOffPrice");
      body.monthlyPrice = form.get("monthlyPrice");
      body.currency = form.get("currency");
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-center text-3xl font-bold">Create your free account</h1>

      {/* Role selector */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        {(
          [
            ["PLAYER", "I'm a player", "Get video feedback from top coaches"],
            ["COACH", "I'm a coach", "Join free and earn from video reviews"],
          ] as const
        ).map(([value, title, sub]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={`rounded-xl border p-4 text-left transition ${
              role === value
                ? "border-court-500 bg-court-50 ring-2 ring-court-200"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-xs text-slate-500">{sub}</span>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input className="input" id="name" name="name" required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Password (min. 8 characters)</label>
          <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>

        {role === "COACH" && (
          <>
            <hr className="border-slate-200" />
            <p className="text-sm font-semibold text-slate-700">Your coach profile</p>
            <div>
              <label className="label" htmlFor="headline">Headline</label>
              <input
                className="input"
                id="headline"
                name="headline"
                placeholder="e.g. Ex-WPT player specialising in net play"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="bio">About you</label>
              <textarea
                className="input"
                id="bio"
                name="bio"
                rows={4}
                placeholder="Your coaching background, playing career, what players can expect from your feedback…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="location">Location</label>
                <input className="input" id="location" name="location" placeholder="e.g. Madrid, Spain" />
              </div>
              <div>
                <label className="label" htmlFor="experienceYears">Years of experience</label>
                <input className="input" id="experienceYears" name="experienceYears" type="number" min={0} max={60} defaultValue={5} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="oneOffPrice">Price per video review</label>
                <input className="input" id="oneOffPrice" name="oneOffPrice" type="number" min={1} step="0.01" required placeholder="25" />
              </div>
              <div>
                <label className="label" htmlFor="monthlyPrice">Monthly plan price</label>
                <input className="input" id="monthlyPrice" name="monthlyPrice" type="number" min={1} step="0.01" required placeholder="79" />
              </div>
              <div>
                <label className="label" htmlFor="currency">Currency</label>
                <select className="input" id="currency" name="currency" defaultValue="EUR">
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Joining is free. The platform keeps a small commission on each
              payment; the rest is yours.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating account…" : role === "COACH" ? "Create coach account" : "Create player account"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-court-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
