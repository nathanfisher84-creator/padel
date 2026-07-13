import { db } from "@/lib/db";
import type { PublicCoach } from "@/components/CoachCard";
import { aiCoachEnabled } from "@/lib/aiCoach";
import { demoPaymentsAllowed } from "@/lib/config";

/**
 * Published coaches with their rating aggregates, shaped as the
 * client-safe PublicCoach (never the full User row). The AI coach is only
 * listed when its engine is configured (or in dev/preview, where the demo
 * review flow works) — never advertise a dead feature.
 */
export async function getPublicCoaches(take?: number): Promise<PublicCoach[]> {
  const showAi = aiCoachEnabled() || demoPaymentsAllowed();
  const [profiles, ratings] = await Promise.all([
    db.coachProfile.findMany({
      where: { isPublished: true, ...(showAi ? {} : { isAi: false }) },
      select: {
        id: true,
        userId: true,
        headline: true,
        bestFor: true,
        bio: true,
        location: true,
        experienceYears: true,
        photoUrl: true,
        oneOffPriceCents: true,
        monthlyPriceCents: true,
        currency: true,
        turnaroundHours: true,
        isAi: true,
        user: { select: { name: true } },
      },
      // Humans first: the homepage's featured roster (take 3) should always
      // be real coaches; the AI tier is surfaced separately in the directory.
      orderBy: [{ isAi: "asc" as const }, { createdAt: "asc" as const }],
      ...(take ? { take } : {}),
    }),
    db.review.groupBy({
      by: ["coachId"],
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const byCoach = new Map(ratings.map((r) => [r.coachId, r]));
  return profiles
    .map((p) => {
      const agg = byCoach.get(p.userId);
      return {
        ...p,
        avgRating: agg?._avg.rating ?? null,
        reviewCount: agg?._count.rating ?? 0,
      };
    })
    // Full directory: the instant AI tier leads as the low-cost entry point.
    // (With `take`, the DB-level humans-first order has already excluded it.)
    .sort((a, b) => Number(b.isAi) - Number(a.isAi));
}
