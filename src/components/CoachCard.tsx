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
      className="card group flex flex-col !p-0 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex-1 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-court-100 text-xl font-bold text-court-700">
            {profile.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold group-hover:text-court-700">
              {profile.user.name}
            </h3>
            <p className="stat truncate text-xs uppercase tracking-wide text-slate-500">
              {profile.location || "Online coaching"}
              {profile.experienceYears > 0 &&
                ` · ${profile.experienceYears} yrs`}
            </p>
          </div>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {profile.headline}
        </p>
      </div>
      <dl className="stat grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 text-sm">
        <div className="px-6 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Video review
          </dt>
          <dd className="mt-0.5 font-semibold text-court-800">
            {formatMoney(profile.oneOffPriceCents, profile.currency)}
          </dd>
        </div>
        <div className="px-6 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">
            Monthly plan
          </dt>
          <dd className="mt-0.5 font-semibold text-court-800">
            {formatMoney(profile.monthlyPriceCents, profile.currency)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
