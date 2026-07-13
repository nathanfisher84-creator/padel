import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "https://www.padelprocoaches.com";
  const coaches = await db.coachProfile.findMany({
    where: { isPublished: true },
    select: { userId: true, updatedAt: true },
  });
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/coaches`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...coaches.map((c) => ({
      url: `${base}/coaches/${c.userId}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
