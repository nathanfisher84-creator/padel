import { db } from "@/lib/db";
import { CoachDirectory } from "@/components/CoachDirectory";

export const dynamic = "force-dynamic";

export default async function CoachesPage() {
  // Select only public fields: this list is serialized into the page for
  // the client-side search — it must never carry the full User row.
  const coaches = await db.coachProfile.findMany({
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
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <p className="eyebrow text-court-600">Coach directory</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">Find your padel coach</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Every coach sets their own rates. Pay once for a single video review,
        or subscribe monthly for ongoing coaching.
      </p>

      {coaches.length === 0 ? (
        <div className="card mt-10 text-center text-slate-500">
          No coaches have joined yet — check back soon, or{" "}
          <a
            href="/register?role=coach"
            className="font-semibold text-court-600 hover:underline"
          >
            be the first coach to register
          </a>
          .
        </div>
      ) : (
        <CoachDirectory coaches={coaches} />
      )}
    </div>
  );
}
