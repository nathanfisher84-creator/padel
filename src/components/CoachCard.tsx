import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { turnaroundLabel } from "@/lib/constants";

/**
 * The public, client-safe slice of a coach profile. Never widen this to
 * include the full User row — these objects are serialized into the page
 * for the searchable directory.
 */
export type PublicCoach = {
  id: string;
  userId: string;
  headline: string;
  bestFor: string | null;
  bio: string;
  location: string | null;
  experienceYears: number;
  photoUrl: string | null;
  oneOffPriceCents: number;
  monthlyPriceCents: number;
  currency: string;
  turnaroundHours: number;
  isAi: boolean;
  user: { name: string };
  avgRating: number | null;
  reviewCount: number;
};

export function CoachCard({ profile }: { profile: PublicCoach }) {
  const href = profile.isAi ? "/ai-coach" : `/coaches/${profile.userId}`;
  return (
    <Link
      href={href}
      className={`card group flex flex-col !p-0 transition hover:-translate-y-0.5 hover:shadow-md ${
        profile.isAi ? "border-ball-500/50 ring-1 ring-ball-500/30" : ""
      }`}
    >
      <div className="flex-1 p-6">
        <div className="flex items-center gap-4">
          {profile.isAi ? (
            <div
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-court-700 to-ball-500 text-2xl text-white"
            >
              ✦
            </div>
          ) : profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt=""
              width={112}
              height={112}
              loading="lazy"
              decoding="async"
              className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-court-100 text-xl font-bold text-court-700">
              {profile.user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 truncate text-lg font-semibold group-hover:text-court-700">
              {profile.user.name}
              {profile.isAi && (
                <span className="badge shrink-0 bg-ball-500/20 text-ball-600">
                  AI
                </span>
              )}
            </h3>
            <p className="stat truncate text-xs uppercase tracking-wide text-slate-600">
              {profile.isAi
                ? "Instant AI analysis · Always available"
                : `${profile.location || "Online coaching"}${
                    profile.experienceYears > 0
                      ? ` · ${profile.experienceYears} yrs`
                      : ""
                  }`}
            </p>
          </div>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {profile.headline}
        </p>
        {profile.bestFor && (
          <p className="mt-2 line-clamp-1 text-xs text-court-700">
            <span className="font-semibold">Best for</span> {profile.bestFor}
          </p>
        )}
        <div className="stat mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-court-800">
            {profile.isAi
              ? "Feedback in minutes"
              : `Replies in ${turnaroundLabel(profile.turnaroundHours)}`}
          </span>
          {profile.isAi ? (
            <span className="text-ball-600">Chat + video review</span>
          ) : profile.avgRating !== null ? (
            <span className="text-slate-600">
              <span className="text-ball-600">★</span>{" "}
              {profile.avgRating.toFixed(1)} ({profile.reviewCount})
            </span>
          ) : (
            <span className="text-slate-500">New on PadelPro</span>
          )}
        </div>
      </div>
      <dl className="stat grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 text-sm">
        <div className="px-6 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-slate-600">
            {profile.isAi ? "AI chat" : "Video review"}
          </dt>
          <dd className="mt-0.5 font-semibold text-court-800">
            {profile.isAi
              ? "Free"
              : formatMoney(profile.oneOffPriceCents, profile.currency)}
          </dd>
        </div>
        <div className="px-6 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-slate-600">
            {profile.isAi ? "Video review" : "Monthly plan"}
          </dt>
          <dd className="mt-0.5 font-semibold text-court-800">
            {formatMoney(
              profile.isAi ? profile.oneOffPriceCents : profile.monthlyPriceCents,
              profile.currency
            )}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
