import Link from "next/link";
import { getPublicCoaches } from "@/lib/coaches";
import { CoachTile } from "@/components/home/CoachTile";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { MissionBall } from "@/components/home/MissionBall";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

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
    q: "How do payments work?",
    a: "You pay securely up front for the coach and plan you choose. Coaches are paid their share automatically after our platform fee — you never handle anything off-platform.",
  },
];

export default async function HomePage() {
  const featured = await getPublicCoaches(3);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="space-y-24">
      <script
        type="application/ld+json"
        // JSON-LD is our own trusted data; escaping "<" prevents any chance of
        // breaking out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Hero />

      {/* Brand statement + the roster (the reference's statement → grid) */}
      <Reveal>
        <section>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-5xl">
              Designed to make you better
            </h2>
            <p className="mt-5 text-xs uppercase leading-relaxed tracking-[0.16em] text-slate-600 sm:text-sm">
              Hand-picked professional coaches. Analysis of your own footage. A
              clear plan for your next match — not vague encouragement.
            </p>
          </div>

          {featured.length > 0 && (
            <>
              <div className="mt-12 mb-6 flex items-end justify-between gap-4">
                <p className="eyebrow text-court-600">The roster</p>
                <Link
                  href="/coaches"
                  className="shrink-0 text-sm font-semibold text-court-700 hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-3">
                {featured.map((profile) => (
                  <CoachTile key={profile.id} profile={profile} />
                ))}
              </div>
            </>
          )}
        </section>
      </Reveal>

      {/* Mission — a standout, brand-forward band (the ball, not a coach) */}
      <Reveal>
        <section className="full-bleed relative isolate overflow-hidden bg-court-950 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage:
                "linear-gradient(#fff3 1px, transparent 1px), linear-gradient(90deg, #fff3 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(207,226,63,0.45) 0%, transparent 70%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="eyebrow text-ball-400">Our mission</p>
              <h2 className="mt-3 text-3xl leading-[1.05] sm:text-5xl">
                Make real coaching reach every court
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-court-200">
                Great coaching shouldn&rsquo;t depend on living near a great
                coach. Upload a match from any phone and get personal analysis
                from a professional — wherever you play, whatever your level.
              </p>
              <Link
                href="/coaches"
                className="mt-8 inline-block rounded-sm bg-ball-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-court-950 transition hover:bg-ball-400"
              >
                Browse coaches
              </Link>
            </div>
            <MissionBall />
          </div>
        </section>
      </Reveal>

      {/* Why video — image left, text right */}
      <Reveal>
        <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 overflow-hidden rounded-2xl lg:order-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/avatars/diego.jpg"
              alt="Diego Fernández, a PadelPro coach"
              width={800}
              height={800}
              loading="lazy"
              decoding="async"
              className="aspect-[5/4] w-full object-cover object-top"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow text-court-600">Why video</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              Your next level is hiding in your last match
            </h2>
            <p className="mt-4 text-slate-600">
              A single match holds dozens of teachable moments — shot selection,
              court position, the points you should have won. Your coach finds
              them and shows you exactly what to change before you play again.
            </p>
            <Link href="#how-it-works" className="btn-secondary mt-7">
              See how it works
            </Link>
          </div>
        </section>
      </Reveal>

      {/* Scrolling ticker */}
      <Marquee />

      {/* How it works */}
      <Reveal>
        <section id="how-it-works" className="scroll-mt-24">
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

      {/* FAQ */}
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

      {/* Final CTA */}
      <Reveal>
        <section className="full-bleed bg-court-950 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-2xl text-3xl sm:text-5xl">
              Ready to see what to work on next?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-court-200">
              Pick a coach, upload a video, and get a personal plan for your
              game.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/coaches"
                className="rounded-sm bg-ball-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-court-950 transition hover:bg-ball-400"
              >
                Browse coaches
              </Link>
              <Link
                href="/register"
                className="rounded-sm border border-white/40 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10"
              >
                Create a free account
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
