import Link from "next/link";
import { db } from "@/lib/db";
import { CoachCard } from "@/components/CoachCard";
import { Scene3D } from "@/components/three/Scene3D";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await db.coachProfile.findMany({
    where: { isPublished: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-court-950 px-6 py-16 text-white sm:px-12 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#fff2 1px, transparent 1px), linear-gradient(90deg, #fff2 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="mb-4 inline-block rounded-full bg-ball-500/20 px-3 py-1 text-sm font-semibold text-ball-400">
              Video analysis for padel players
            </p>
            <h1 className="text-4xl leading-tight sm:text-5xl">
              Get personal feedback from{" "}
              <span className="text-ball-400">professional padel coaches</span>
            </h1>
            <p className="mt-4 text-lg text-court-100">
              Record your match or training session, upload the video, and
              receive detailed, personalised feedback from the coach you choose
              — wherever you play.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/coaches" className="btn-primary !bg-ball-500 !text-court-950 hover:!bg-ball-400">
                Find your coach
              </Link>
              <Link
                href="/register?role=coach"
                className="btn-secondary !border-court-700 !bg-transparent !text-white hover:!bg-court-900"
              >
                I&apos;m a coach — join free
              </Link>
            </div>
          </div>
          <Scene3D className="h-[260px] w-full sm:h-[320px] lg:h-[380px]" />
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-center text-3xl">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Choose a coach",
              text: "Browse profiles of verified padel coaches. Every coach sets their own rates — pay per video review or subscribe monthly.",
            },
            {
              step: "2",
              title: "Upload your video",
              text: "Film your match or drills on any phone and upload it straight from the app or website.",
            },
            {
              step: "3",
              title: "Get expert feedback",
              text: "Your coach analyses your technique, positioning and tactics, and sends you detailed feedback to level up your game.",
            },
          ].map((item) => (
            <div key={item.step} className="card text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-court-100 text-xl font-bold text-court-700">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured coaches */}
      {featured.length > 0 && (
        <section>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl">Featured coaches</h2>
            <Link href="/coaches" className="font-semibold text-court-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((profile) => (
              <CoachCard key={profile.id} profile={profile} />
            ))}
          </div>
        </section>
      )}

      {/* For coaches */}
      <section className="card sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <h2 className="text-2xl">Are you a padel coach?</h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Create your profile for free, set your own prices for one-off video
            reviews and monthly coaching plans, and earn from players around the
            world. You keep the majority of every payment.
          </p>
        </div>
        <Link
          href="/register?role=coach"
          className="btn-primary mt-6 shrink-0 sm:mt-0"
        >
          Register as a coach
        </Link>
      </section>
    </div>
  );
}
