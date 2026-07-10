import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Role, SubmissionStatus } from "@/lib/constants";
import { PurchasePanel } from "@/components/PurchasePanel";

export const dynamic = "force-dynamic";

export default async function CoachDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const coach = await db.user.findUnique({
    where: { id: params.id },
    include: { coachProfile: true },
  });
  if (!coach?.coachProfile?.isPublished) notFound();
  const profile = coach.coachProfile;

  const session = await getSession();
  const reviewsGiven = await db.videoSubmission.count({
    where: { coachId: coach.id, status: SubmissionStatus.REVIEWED },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
      <div>
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-court-100 text-3xl font-bold text-court-700">
            {coach.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{coach.name}</h1>
            <p className="text-slate-500">
              {profile.location || "Online coaching"}
              {profile.experienceYears > 0 &&
                ` · ${profile.experienceYears} years of experience`}
            </p>
            {reviewsGiven > 0 && (
              <p className="mt-1 text-sm font-medium text-ball-600">
                {reviewsGiven} video review{reviewsGiven === 1 ? "" : "s"} delivered
              </p>
            )}
          </div>
        </div>

        <h2 className="mt-8 text-xl font-semibold">{profile.headline}</h2>
        {profile.bio && (
          <p className="mt-3 whitespace-pre-line text-slate-600">{profile.bio}</p>
        )}

        <div className="card mt-8">
          <h3 className="font-semibold">How coaching works</h3>
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-slate-600">
            <li>Purchase a one-off review or a monthly plan on the right.</li>
            <li>Upload a video of your match or training from your dashboard.</li>
            <li>
              {coach.name.split(" ")[0]} analyses your game and sends you written
              feedback, usually within a few days.
            </li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <h3 className="text-lg font-semibold">Single video review</h3>
          <p className="mt-1 text-3xl font-extrabold text-court-700">
            {formatMoney(profile.oneOffPriceCents, profile.currency)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            One-off payment for detailed feedback on one video.
          </p>
        </div>
        <div className="card border-court-300 ring-1 ring-court-200">
          <span className="badge bg-ball-500/20 text-ball-600">Best value</span>
          <h3 className="mt-2 text-lg font-semibold">Monthly coaching</h3>
          <p className="mt-1 text-3xl font-extrabold text-court-700">
            {formatMoney(profile.monthlyPriceCents, profile.currency)}
            <span className="text-base font-medium text-slate-500"> / month</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Up to {profile.monthlyVideoLimit} video reviews every month.
          </p>
        </div>
        <PurchasePanel
          coachId={coach.id}
          loggedIn={Boolean(session)}
          isPlayer={session?.role === Role.PLAYER}
        />
      </div>
    </div>
  );
}
