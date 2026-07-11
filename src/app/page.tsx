import Link from "next/link";
import { db } from "@/lib/db";
import { CoachCard } from "@/components/CoachCard";
import { Hero } from "@/components/home/Hero";
import { Reveal } from "@/components/motion/Reveal";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    step: "01",
    title: "Choose your coach",
    text: "Compare verified coach profiles side by side — experience, specialty and rates are all up front.",
  },
  {
    step: "02",
    title: "Upload your match",
    text: "Film on any phone and upload straight from the browser — full matches or drills, up to 500 MB per video.",
  },
  {
    step: "03",
    title: "Get your analysis",
    text: "Your coach reviews the footage and sends written, personal feedback: technique, court positioning and match tactics.",
  },
];

export default async function HomePage() {
  const featured = await db.coachProfile.findMany({
    where: { isPublished: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  const coachCount = featured.length;
  const cheapest = featured.reduce(
    (min, p) => (p.oneOffPriceCents < min.oneOffPriceCents ? p : min),
    featured[0]
  );
  const fromPrice = cheapest
    ? formatMoney(cheapest.oneOffPriceCents, cheapest.currency)
    : "€25";

  return (
    <div className="space-y-24">
      <Hero coachCount={coachCount} fromPrice={fromPrice} />

      {/* Featured coaches — the marketplace leads with its supply */}
      {featured.length > 0 && (
        <Reveal>
          <section>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-court-600">The roster</p>
                <h2 className="mt-2 text-3xl">Featured coaches</h2>
              </div>
              <Link
                href="/coaches"
                className="stat shrink-0 text-sm font-semibold text-court-700 hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((profile) => (
                <CoachCard key={profile.id} profile={profile} />
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* The game, in motion */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl bg-court-950">
          <video
            className="h-[340px] w-full object-cover sm:h-[440px]"
            poster="/media/hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
          >
            <source src="/media/hero-loop.webm" type="video/webm" />
            <source src="/media/hero-loop.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-court-950/90 via-court-950/10 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 text-white sm:p-10">
            <p className="eyebrow text-ball-400">Every point has a lesson in it</p>
            <h2 className="mt-2 max-w-lg text-3xl">
              Your coach finds it — shot by shot
            </h2>
            <p className="mt-2 max-w-md text-sm text-court-200">
              Real analysis from your own footage: smash selection, court
              coverage, the points you should have won.
            </p>
          </div>
        </section>
      </Reveal>

      {/* How it works — a genuine sequence, so numbered */}
      <Reveal>
        <section>
          <div className="mb-10 max-w-xl">
            <p className="eyebrow text-court-600">How it works</p>
            <h2 className="mt-2 text-3xl">From match footage to match plan</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="card">
                <p className="stat text-sm text-ball-600">{item.step}</p>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Coach recruitment */}
      <Reveal>
        <section className="overflow-hidden rounded-3xl bg-court-950 text-white">
          <div className="grid items-center gap-8 px-6 py-12 sm:px-12 lg:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <p className="eyebrow text-ball-400">For coaches</p>
              <h2 className="mt-3 text-3xl">
                Coach players around the world
              </h2>
              <p className="mt-4 text-court-200">
                Create a free profile and receive match videos from players
                wherever you are. Review on your own schedule, from any court
                or couch — your full terms are in your coach dashboard once
                you join.
              </p>
              <Link
                href="/register?role=coach"
                className="btn-primary mt-7 !bg-ball-500 !text-court-950 hover:!bg-ball-400"
              >
                Create your coach profile
              </Link>
            </div>
            <p
              className="stat hidden text-right font-bold leading-none text-court-800 lg:block"
              style={{ fontSize: "7rem" }}
              aria-hidden
            >
              PRO
            </p>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
