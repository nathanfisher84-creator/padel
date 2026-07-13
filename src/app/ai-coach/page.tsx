import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getEntitlementForCoach } from "@/lib/entitlements";
import { formatMoney } from "@/lib/format";
import { Role } from "@/lib/constants";
import { getAiCoach, aiCoachEnabled, AI_COACH_NAME } from "@/lib/aiCoach";
import { aiPromoCode } from "@/lib/config";
import { AiCoachChat } from "@/components/AiCoachChat";
import { PromoCodeForm } from "@/components/PromoCodeForm";
import { PurchasePanel } from "@/components/PurchasePanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova — your instant AI padel coach",
  description:
    "Chat free with PadelPro's AI coach about technique, tactics and positioning — or get an instant video review: Nova watches your full video and pins timestamped feedback to it in minutes.",
};

export default async function AiCoachPage() {
  const [coach, session] = await Promise.all([getAiCoach(), getSession()]);
  if (!coach?.coachProfile) notFound();
  const profile = coach.coachProfile;

  const enabled = aiCoachEnabled();
  const isPlayer = session?.role === Role.PLAYER;
  // A player who already bought a review skips straight to the upload.
  const entitlement =
    isPlayer && session ? await getEntitlementForCoach(session.id, coach.id) : null;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.photoUrl ?? "/avatars/nova.svg"}
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
          <p className="mt-1 text-slate-600">{profile.headline}</p>
          <p className="stat mt-1 text-xs uppercase tracking-wide text-court-700">
            Free chat · Video reviews from{" "}
            {formatMoney(profile.oneOffPriceCents, profile.currency)} · Instant
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
          <div className="card border-court-300 ring-1 ring-court-200">
            <h2 className="font-semibold">Instant video review</h2>
            <p className="mt-1 text-3xl font-extrabold text-court-700">
              {formatMoney(profile.oneOffPriceCents, profile.currency)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Send a match or training video and {AI_COACH_NAME} watches the
              whole thing — written feedback plus timestamped notes pinned to
              your footage, in minutes. Or{" "}
              {formatMoney(profile.monthlyPriceCents, profile.currency)}/month
              for up to {profile.monthlyVideoLimit} reviews.
            </p>
            {entitlement ? (
              <Link href="/dashboard/upload" className="btn-primary mt-3 w-full">
                Upload your video
              </Link>
            ) : (
              <div className="mt-4">
                <PurchasePanel
                  coachId={coach.id}
                  loggedIn={Boolean(session)}
                  isPlayer={isPlayer}
                />
                {aiPromoCode() && (!session || isPlayer) && (
                  <PromoCodeForm loggedIn={Boolean(session)} />
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold">How {AI_COACH_NAME} helps</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>• Free instant answers on grip, positioning, shots and tactics</li>
              <li>• Beginner-friendly, padel-only, always available</li>
              <li>• Timestamped video breakdowns of your own game</li>
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
