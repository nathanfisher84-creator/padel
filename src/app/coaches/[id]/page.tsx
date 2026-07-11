import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Role, SubmissionStatus, turnaroundLabel } from "@/lib/constants";
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
  const [reviewsGiven, ratingAgg, playerReviews] = await Promise.all([
    db.videoSubmission.count({
      where: { coachId: coach.id, status: SubmissionStatus.REVIEWED },
    }),
    db.review.aggregate({
      where: { coachId: coach.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    db.review.findMany({
      where: { coachId: coach.id, comment: { not: null } },
      include: { player: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
      <div>
        <div className="flex items-center gap-5">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt={`Photo of ${coach.name}`}
              className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-court-100 text-3xl font-bold text-court-700">
              {coach.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{coach.name}</h1>
            <p className="text-slate-500">
              {profile.location || "Online coaching"}
              {profile.experienceYears > 0 &&
                ` · ${profile.experienceYears} years of experience`}
            </p>
            <div className="stat mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-court-800">
                Replies in {turnaroundLabel(profile.turnaroundHours)}
              </span>
              {ratingAgg._count.rating > 0 && (
                <span className="text-slate-600">
                  <span className="text-ball-600">★</span>{" "}
                  {ratingAgg._avg.rating?.toFixed(1)} ({ratingAgg._count.rating})
                </span>
              )}
              {reviewsGiven > 0 && (
                <span className="text-ball-600">
                  {reviewsGiven} review{reviewsGiven === 1 ? "" : "s"} delivered
                </span>
              )}
            </div>
          </div>
        </div>

        <h2 className="mt-8 text-xl font-semibold">{profile.headline}</h2>
        {profile.bio && (
          <p className="mt-3 whitespace-pre-line text-slate-600">{profile.bio}</p>
        )}

        {profile.introVideoUrl && (
          <div className="mt-8">
            <p className="eyebrow text-court-600">
              Meet {coach.name.split(" ")[0]}
            </p>
            <video
              controls
              preload="metadata"
              src={profile.introVideoUrl}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-court-950"
            />
          </div>
        )}

        {(profile.certifications || profile.careerHighlights || profile.languages) && (
          <div className="card mt-8">
            <h3 className="font-semibold">Credentials</h3>
            <dl className="mt-3 space-y-4 text-sm">
              {profile.certifications && (
                <div>
                  <dt className="eyebrow text-court-600">Certifications</dt>
                  <dd className="mt-1">
                    <ul className="list-inside list-disc space-y-0.5 text-slate-600">
                      {profile.certifications.split("\n").filter(Boolean).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {profile.careerHighlights && (
                <div>
                  <dt className="eyebrow text-court-600">Career highlights</dt>
                  <dd className="mt-1">
                    <ul className="list-inside list-disc space-y-0.5 text-slate-600">
                      {profile.careerHighlights.split("\n").filter(Boolean).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {profile.languages && (
                <div>
                  <dt className="eyebrow text-court-600">Coaching languages</dt>
                  <dd className="mt-1 text-slate-600">{profile.languages}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {playerReviews.length > 0 && (
          <div className="card mt-8">
            <h3 className="font-semibold">What players say</h3>
            <ul className="mt-3 space-y-4">
              {playerReviews.map((r) => (
                <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-ball-600" aria-label={`${r.rating} out of 5 stars`}>
                    {"★".repeat(r.rating)}
                    <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
                  <p className="stat mt-1 text-xs uppercase tracking-wide text-slate-400">
                    {r.player.name.split(" ")[0]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
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
