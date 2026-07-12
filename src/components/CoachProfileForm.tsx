"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProfileValues = {
  headline: string;
  bio: string;
  location: string;
  experienceYears: number;
  oneOffPrice: number;
  monthlyPrice: number;
  monthlyVideoLimit: number;
  currency: string;
  isPublished: boolean;
  turnaroundHours: number;
  languages: string;
  certifications: string;
  careerHighlights: string;
};

export function CoachProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/coach/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: form.get("headline"),
        bio: form.get("bio"),
        location: form.get("location") || undefined,
        experienceYears: form.get("experienceYears"),
        oneOffPrice: form.get("oneOffPrice"),
        monthlyPrice: form.get("monthlyPrice"),
        monthlyVideoLimit: form.get("monthlyVideoLimit"),
        currency: form.get("currency"),
        turnaroundHours: form.get("turnaroundHours"),
        languages: form.get("languages"),
        certifications: form.get("certifications"),
        careerHighlights: form.get("careerHighlights"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save profile.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="headline">Headline</label>
        <input className="input" id="headline" name="headline" required defaultValue={initial.headline} />
      </div>
      <div>
        <label className="label" htmlFor="bio">About you</label>
        <textarea className="input" id="bio" name="bio" rows={5} defaultValue={initial.bio} />
        <p className="mt-1 text-xs text-slate-500">
          Emails, phone numbers and links are automatically removed from your
          public profile — players contact you by booking a review.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input className="input" id="location" name="location" defaultValue={initial.location} />
        </div>
        <div>
          <label className="label" htmlFor="experienceYears">Years of experience</label>
          <input className="input" id="experienceYears" name="experienceYears" type="number" min={0} max={60} defaultValue={initial.experienceYears} />
        </div>
      </div>
      <hr className="border-slate-200" />
      <p className="text-sm font-semibold text-slate-700">Pricing</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="oneOffPrice">Per video review</label>
          <input className="input" id="oneOffPrice" name="oneOffPrice" type="number" min={1} step="0.01" required defaultValue={initial.oneOffPrice} />
        </div>
        <div>
          <label className="label" htmlFor="monthlyPrice">Monthly plan</label>
          <input className="input" id="monthlyPrice" name="monthlyPrice" type="number" min={1} step="0.01" required defaultValue={initial.monthlyPrice} />
        </div>
        <div>
          <label className="label" htmlFor="currency">Currency</label>
          <select className="input" id="currency" name="currency" defaultValue={initial.currency}>
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="GBP">GBP £</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="monthlyVideoLimit">
          Videos included per month on the monthly plan
        </label>
        <input className="input" id="monthlyVideoLimit" name="monthlyVideoLimit" type="number" min={1} max={30} defaultValue={initial.monthlyVideoLimit} />
      </div>
      <div>
        <label className="label" htmlFor="turnaroundHours">
          Your response-time commitment (shown to players)
        </label>
        <select className="input" id="turnaroundHours" name="turnaroundHours" defaultValue={initial.turnaroundHours}>
          <option value={24}>Within 24 hours</option>
          <option value={48}>Within 48 hours</option>
          <option value={72}>Within 72 hours</option>
          <option value={168}>Within 7 days</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="languages">Languages you coach in</label>
        <input className="input" id="languages" name="languages" defaultValue={initial.languages} placeholder="e.g. Spanish, English" />
      </div>
      <div>
        <label className="label" htmlFor="certifications">
          Certifications (one per line)
        </label>
        <textarea className="input" id="certifications" name="certifications" rows={3} defaultValue={initial.certifications} placeholder={"e.g. FIP Coaching Course Level 2"} />
      </div>
      <div>
        <label className="label" htmlFor="careerHighlights">
          Career highlights (one per line)
        </label>
        <textarea className="input" id="careerHighlights" name="careerHighlights" rows={3} defaultValue={initial.careerHighlights} placeholder={"e.g. Coached a junior national champion"} />
      </div>
      <p className="text-xs text-slate-500">
        {initial.isPublished
          ? "Your profile is live. Edits appear immediately."
          : "Your profile is awaiting review by our team — it will go live once approved."}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm font-medium text-ball-600">Profile saved ✓</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
