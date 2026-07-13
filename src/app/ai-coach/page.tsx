import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { getAiCoach, aiCoachEnabled, AI_COACH_NAME } from "@/lib/aiCoach";
import { AiCoachChat } from "@/components/AiCoachChat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova — your free AI padel coach",
  description:
    "Ask PadelPro's AI coach anything about padel technique, tactics and positioning, or upload a clip for an instant timestamped review. Free.",
};

export default async function AiCoachPage() {
  const [coach, session] = await Promise.all([getAiCoach(), getSession()]);
  if (!coach?.coachProfile) notFound();

  const enabled = aiCoachEnabled();
  const isPlayer = session?.role === Role.PLAYER;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coach.coachProfile.photoUrl ?? "/avatars/nova.svg"}
          alt=""
          width={96}
          height={96}
          className="h-20 w-20 shrink-0 rounded-2xl border border-slate-200"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{AI_COACH_NAME}</h1>
            <span className="badge bg-ball-500/20 text-ball-600">AI coach</span>
          </div>
          <p className="mt-1 text-slate-600">
            {coach.coachProfile.headline}
          </p>
          <p className="stat mt-1 text-xs uppercase tracking-wide text-court-700">
            Best for {coach.coachProfile.bestFor} · Free · Instant
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Chat */}
        <div>
          <AiCoachChat loggedIn={Boolean(session)} enabled={enabled} />
          {!enabled && (
            <p className="mt-3 text-sm text-slate-500">
              The AI coach is being switched on — check back shortly.
            </p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card">
            <h2 className="font-semibold">Get an instant video review</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload a short clip and {AI_COACH_NAME} returns written feedback with
              timestamped notes you can click to jump to — in seconds, for free.
            </p>
            {isPlayer ? (
              <Link href="/dashboard/upload" className="btn-primary mt-3 w-full">
                Upload a clip
              </Link>
            ) : session ? (
              <p className="mt-3 text-xs text-slate-500">
                Video reviews are for player accounts.
              </p>
            ) : (
              <Link
                href="/login?next=/dashboard/upload"
                className="btn-primary mt-3 w-full"
              >
                Log in to upload
              </Link>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Tip: keep it short (a few rallies) for the fastest, sharpest read.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold">How {AI_COACH_NAME} helps</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>• Instant answers on grip, positioning, shots and tactics</li>
              <li>• Beginner-friendly, padel-only, always available</li>
              <li>• Timestamped breakdowns of your own clips</li>
            </ul>
          </div>

          <div className="card border-court-300 bg-court-50">
            <h2 className="font-semibold">Want a human eye?</h2>
            <p className="mt-1 text-sm text-slate-600">
              For a deep technique breakdown or match prep, our pro coaches give
              detailed, personal video reviews.
            </p>
            <Link href="/coaches" className="btn-secondary mt-3 w-full">
              Browse human coaches
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
