import Link from "next/link";
import type { CoachProfile, User } from "@prisma/client";
import { formatMoney } from "@/lib/format";

export function CoachCard({
  profile,
}: {
  profile: CoachProfile & { user: User };
}) {
  return (
    <Link
      href={`/coaches/${profile.userId}`}
      className="card block transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-court-100 text-xl font-bold text-court-700">
          {profile.user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{profile.user.name}</h3>
          <p className="truncate text-sm text-slate-500">
            {profile.location || "Online coaching"}
            {profile.experienceYears > 0 && ` · ${profile.experienceYears} yrs experience`}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-slate-600">{profile.headline}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="badge bg-court-100 text-court-800">
          {formatMoney(profile.oneOffPriceCents, profile.currency)} / video review
        </span>
        <span className="badge bg-ball-500/20 text-ball-600">
          {formatMoney(profile.monthlyPriceCents, profile.currency)} / month
        </span>
      </div>
    </Link>
  );
}
