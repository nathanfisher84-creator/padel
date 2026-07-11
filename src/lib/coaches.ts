import { db } from "@/lib/db";
import type { PublicCoach } from "@/components/CoachCard";

/**
 * Published coaches with their rating aggregates, shaped as the
 * client-safe PublicCoach (never the full User row).
 */
export async function getPublicCoaches(take?: number): Promise<PublicCoach[]> {
  const [profiles, ratings] = await Promise.all([
    db.coachProfile.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        userId: true,
        headline: true,
        bio: true,
        location: true,
        experienceYears: true,
        photoUrl: true,
        oneOffPriceCents: true,
        monthlyPriceCents: true,
        currency: true,
        turnaroundHours: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      ...(take ? { take } : {}),
    }),
    db.review.groupBy({
      by: ["coachId"],
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const byCoach = new Map(ratings.map((r) => [r.coachId, r]));
  return profiles.map((p) => {
    const agg = byCoach.get(p.userId);
    return {
      ...p,
      avgRating: agg?._avg.rating ?? null,
      reviewCount: agg?._count.rating ?? 0,
    };
  });
}
