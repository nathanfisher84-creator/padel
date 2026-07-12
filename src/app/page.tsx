import Link from "next/link";
import { getPublicCoaches } from "@/lib/coaches";
import { CoachCard } from "@/components/CoachCard";
import { Hero } from "@/components/home/Hero";
import { Reveal } from "@/components/motion/Reveal";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const TRUST = [
  "Every coach hand-verified",
  "A reply time on every profile",
  "Written + video feedback",
  "Secure payments",
];

const DIFFERENTIATORS = [
  {
    title: "A curated roster, not a directory",
    text: "Every coach is reviewed and approved by us before they appear. You're choosing from professionals we've vetted — not scrolling an endless, unfiltered list.",
  },
  {
    title: "A reply time, in writing",
    text: "Each coach commits to a turnaround — from 24 hours to a few days — shown right on their profile. No more uploading a video and waiting weeks to hear back.",
  },
  {
    title: "Feedback you can actually use",
    text: "Personal analysis of your own footage: clear written notes, and often a video where your coach talks through the play. Every review is rated by the player afterwards.",
  },
];

const REVIEW_COVERS = [
  "Bandeja",
  "Víbora",
  "Smash",
  "Serve & return",
  "Volleys",
  "Court positioning",
  "Transitions",
  "Glass play",
  "Shot selection",
  "Match tactics",
];

const STEPS = [
  {
    step: "01",
    title: "Choose your coach",
    text: "Compare verified coach profiles side by side — experience, specialty, reply time and rates are all up front.",
  },
  {
    step: "02",
    title: "Upload your match",
    text: "Film on any phone and upload straight from the browser — full matches or drills, up to 500 MB. Tell your coach what to focus on.",
  },
  {
    step: "03",
    title: "Get your analysis",
    text: "Your coach reviews the footage and sends personal feedback within their committed time: technique, positioning and tactics.",
  },
];

const FAQ = [
  {
    q: "How quickly will I get my feedback?",
    a: "Each coach sets and displays their own reply time — anywhere from 24 hours to a few days. It's shown on every profile and coach card, so you know before you pay.",
  },
  {
    q: "What kind of video should I upload?",
    a: "Whatever you want analysed: a full match, a set, or a drills session. Film from behind the court on any phone. You can point your coach at specific shots or moments when you upload.",
  },
  {
    q: "How are coaches vetted?",
    a: "Every coach is manually reviewed and approved before their profile goes live. We check their stated experience and credentials so the roster stays professional.",
  },
  {
    q: "What's the difference between one-off and monthly?",
    a: "A one-off review covers a single video. A monthly plan includes a set number of reviews each month at a better price — ideal if you're working on your game continuously with the same coach.",
  },
  {
    q: "Can I keep working with the same coach?",
    a: "Absolutely — most players do. Subscribe monthly, or just buy another review whenever you have new footage. All of it stays in one place in your dashboard.",
  },
  {
    q: "How do payments work?",
    a: "You pay securely up front for the coach and plan you choose. Coaches are paid their share automatically after our platform fee — you never handle anything off-platform.",
  },
];

export default async function HomePage() {
  const featured = await getPublicCoaches(3);

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

      {/* Trust strip — a slim row of promises straight under the hero */}
      <Reveal>
        <ul className="-mt-10 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-bone-200 bg-white px-6 py-5 shadow-sm sm:grid-cols-4">
          {TRUST.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
              <svg
                viewBox="0 0 20 20"
                className="mt-0.5 h-4 w-4 shrink-0 text-court-600"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 10.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z"
                  clipRule="evenodd"
                />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Featured coaches — the marketplace leads with its supply */}
      {featured.length > 0 && (
        <Reveal>
          <section>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-court-600">The roster</p>
                <h2 className="mt-2 text-3xl sm:text-4xl">Featured coaches</h2>
              </div>
              <Link
                href="/coaches"
                className="shrink-0 text-sm font-semibold text-court-700 hover:underline"
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

      {/* Why PadelPro — the differentiators, editorial */}
      <Reveal>
        <section>
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow text-court-600">Why PadelPro</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">
              Built to feel like a real coaching relationship
            </h2>
            <p className="mt-4 text-slate-600">
              Not a lead-generation directory. A curated marketplace where every
              coach is vetted, every reply time is a commitment, and every review
              is personal.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {DIFFERENTIATORS.map((d, i) => (
              <div
                key={d.title}
                className="card flex flex-col transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="stat text-sm font-semibold text-ball-600">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-xl">{d.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {d.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* The game, in motion */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] bg-court-950">
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
            <h2 className="mt-2 max-w-lg text-3xl sm:text-4xl">
              Your coach finds it — shot by shot
            </h2>
            <p className="mt-2 max-w-md text-sm text-court-200">
              Real analysis from your own footage: smash selection, court
              coverage, the points you should have won.
            </p>
          </div>
        </section>
      </Reveal>

      {/* What's in every review — grounded in the focus-shot feature */}
      <Reveal>
        <section className="rounded-[2rem] border border-bone-200 bg-cream-50 px-6 py-12 sm:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="eyebrow text-court-600">What you get</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">
                A breakdown of the shots that decide your matches
              </h2>
              <p className="mt-4 text-slate-600">
                When you upload, you can tell your coach exactly what to look at.
                They&rsquo;ll analyse those moments in detail and give you
                specific, practisable fixes — not vague encouragement.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {REVIEW_COVERS.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-bone-300 bg-white px-4 py-2 text-sm font-medium text-court-800 shadow-sm"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* How it works — a genuine sequence, so numbered */}
      <Reveal>
        <section>
          <div className="mb-10 max-w-xl">
            <p className="eyebrow text-court-600">How it works</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">
              From match footage to match plan
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="card">
                <p className="stat text-sm font-semibold text-ball-600">
                  {item.step}
                </p>
                <h3 className="mt-3 text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* FAQ — accessible, no-JS disclosure list */}
      <Reveal>
        <section>
          <div className="mb-8 max-w-xl">
            <p className="eyebrow text-court-600">Good to know</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Questions, answered</h2>
          </div>
          <div className="mx-auto max-w-3xl divide-y divide-bone-200 rounded-2xl border border-bone-200 bg-white">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-base font-semibold text-court-950 marker:hidden">
                  {item.q}
                  <svg
                    viewBox="0 0 20 20"
                    className="h-5 w-5 shrink-0 text-court-500 transition group-open:rotate-45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path strokeLinecap="round" d="M10 4v12M4 10h12" />
                  </svg>
                </summary>
                <p className="-mt-1 pb-5 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Coach recruitment */}
      <Reveal>
        <section className="overflow-hidden rounded-[2rem] bg-court-950 text-white">
          <div className="grid items-center gap-8 px-6 py-12 sm:px-12 lg:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <p className="eyebrow text-ball-400">For coaches</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">
                Coach players around the world
              </h2>
              <p className="mt-4 text-court-200">
                Create a free profile and receive match videos from players
                wherever you are. Set your own rates, review on your own
                schedule, and keep the majority of every payment — your full
                terms are in your coach dashboard once you join.
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

      {/* Final CTA */}
      <Reveal>
        <section className="rounded-[2rem] border border-bone-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl sm:text-4xl">
            Your next level is hiding in your last match.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Pick a coach, upload a video, and find out what to work on next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/coaches" className="btn-primary">
              Browse coaches
            </Link>
            <Link href="/register" className="btn-secondary">
              Create a free account
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
