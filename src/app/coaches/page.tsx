import { db } from "@/lib/db";
import { CoachCard } from "@/components/CoachCard";

export const dynamic = "force-dynamic";

export default async function CoachesPage() {
  const coaches = await db.coachProfile.findMany({
    where: { isPublished: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold">Find your padel coach</h1>
      <p className="mt-2 text-slate-600">
        Every coach sets their own rates. Pay once for a single video review, or
        subscribe monthly for ongoing coaching.
      </p>

      {coaches.length === 0 ? (
        <div className="card mt-10 text-center text-slate-500">
          No coaches have joined yet — check back soon, or{" "}
          <a href="/register?role=coach" className="font-semibold text-court-600 hover:underline">
            be the first coach to register
          </a>
          .
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((profile) => (
            <CoachCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
