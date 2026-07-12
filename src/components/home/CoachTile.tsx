import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { turnaroundLabel } from "@/lib/constants";
import type { PublicCoach } from "@/components/CoachCard";

/**
 * Image-forward coach card for the homepage grid — the reference's product
 * tile, adapted: a tall portrait with a rating/reply badge, then name,
 * specialty and starting price.
 */
export function CoachTile({ profile }: { profile: PublicCoach }) {
  return (
    <Link href={`/coaches/${profile.userId}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-court-100">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoUrl}
            alt=""
            width={800}
            height={800}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-bold text-court-700">
            {profile.user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="stat absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-court-800 shadow-sm">
          {profile.avgRating !== null
            ? `★ ${profile.avgRating.toFixed(1)} (${profile.reviewCount})`
            : `Replies in ${turnaroundLabel(profile.turnaroundHours)}`}
        </span>
      </div>
      <h3 className="mt-3 text-lg transition group-hover:text-court-700">
        {profile.user.name}
      </h3>
      <p className="line-clamp-1 text-sm text-slate-600">
        {profile.location || "Online coaching"}
        {profile.experienceYears > 0 && ` · ${profile.experienceYears} yrs`}
      </p>
      {profile.bestFor && (
        <p className="mt-1 line-clamp-1 text-xs text-court-700">
          <span className="font-semibold">Best for</span> {profile.bestFor}
        </p>
      )}
      <p className="stat mt-1 text-sm font-semibold text-court-800">
        Video review from{" "}
        {formatMoney(profile.oneOffPriceCents, profile.currency)}
      </p>
    </Link>
  );
}
