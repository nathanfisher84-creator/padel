"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { PhotoCapture } from "@/components/PhotoCapture";
import { IntroVideoInput } from "@/components/IntroVideoInput";

export function RegisterForm({ useBlobStorage }: { useBlobStorage: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"PLAYER" | "COACH">(
    params.get("role") === "coach" ? "COACH" : "PLAYER"
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Set once the account exists, so a failed media upload can be retried
  // without re-registering.
  const [registered, setRegistered] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (role === "COACH" && !photo) {
      setError("Add a profile photo — take a selfie or choose a picture.");
      return;
    }
    setBusy(true);

    try {
      if (!registered) {
        setStatus("Creating your account…");
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
          body.turnaroundHours = form.get("turnaroundHours");
          body.languages = form.get("languages");
          body.certifications = form.get("certifications");
          body.careerHighlights = form.get("careerHighlights");
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Registration failed.");
        }
        setRegistered(true);
      }

      if (role === "COACH") {
        if (photo) {
          setStatus("Uploading your photo…");
          const photoForm = new FormData();
          photoForm.append("photo", photo);
          const res = await fetch("/api/coach/media", {
            method: "POST",
            body: photoForm,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Photo upload failed — try again.");
          }
          setPhoto(null); // uploaded; don't re-send on retry
        }
        if (introVideo) {
          setStatus("Uploading your intro video…");
          await uploadIntroVideo(introVideo, setStatus, useBlobStorage);
          setIntroVideo(null);
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
      setStatus(null);
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
            disabled={registered}
            className={`rounded-xl border p-4 text-left transition ${
              role === value
                ? "border-court-500 bg-court-50 ring-2 ring-court-200"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-xs text-slate-600">{sub}</span>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        <fieldset disabled={registered} className="space-y-4">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="turnaroundHours">
                    Response-time commitment
                  </label>
                  <select className="input" id="turnaroundHours" name="turnaroundHours" defaultValue={72}>
                    <option value={24}>Within 24 hours</option>
                    <option value={48}>Within 48 hours</option>
                    <option value={72}>Within 72 hours</option>
                    <option value={168}>Within 7 days</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="languages">Languages you coach in</label>
                  <input className="input" id="languages" name="languages" placeholder="e.g. Spanish, English" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="certifications">
                  Certifications (one per line)
                </label>
                <textarea className="input" id="certifications" name="certifications" rows={2} placeholder={"e.g. FIP Coaching Course Level 2"} />
              </div>
              <div>
                <label className="label" htmlFor="careerHighlights">
                  Career highlights (one per line)
                </label>
                <textarea className="input" id="careerHighlights" name="careerHighlights" rows={2} placeholder={"e.g. Coached a junior national champion"} />
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
                  <select className="input" id="currency" name="currency" defaultValue="AED">
                    <option value="AED">AED د.إ</option>
                    <option value="EUR">EUR €</option>
                    <option value="USD">USD $</option>
                    <option value="GBP">GBP £</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </fieldset>

        {role === "COACH" && (
          <>
            <hr className="border-slate-200" />
            <div>
              <span className="label">Profile photo (required)</span>
              <p className="mb-3 text-xs text-slate-600">
                Players want to see who&apos;s coaching them. Take a selfie
                with your camera or choose a picture.
              </p>
              <PhotoCapture onChange={setPhoto} />
            </div>
            <div>
              <span className="label">Intro video</span>
              <IntroVideoInput onChange={setIntroVideo} />
            </div>
            <p className="text-xs text-slate-600">
              Joining is free. Every coach profile is reviewed by our team
              before going live — you&apos;ll see the status in your dashboard,
              along with your full payment terms.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy
            ? status ?? "Working…"
            : registered
              ? "Retry uploads"
              : role === "COACH"
                ? "Create coach account"
                : "Create player account"}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-court-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

/** Upload the intro video: straight to Blob on Vercel, multipart locally. */
async function uploadIntroVideo(
  file: File,
  setStatus: (s: string) => void,
  useBlobStorage: boolean
) {
  if (useBlobStorage) {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/videos/upload-token",
      clientPayload: JSON.stringify({ kind: "coach-intro" }),
      onUploadProgress: ({ percentage }) =>
        setStatus(`Uploading your intro video… ${Math.round(percentage)}%`),
    });
    const res = await fetch("/api/coach/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ introVideoUrl: blob.url }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Video upload failed — try again.");
    }
  } else {
    const form = new FormData();
    form.append("video", file);
    const res = await fetch("/api/coach/media", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Video upload failed — try again.");
    }
  }
}
