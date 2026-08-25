"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// The 3D ball is decorative and WebGL-only: load it client-side after the
// hero paints, so three.js stays out of the critical path entirely.
const PadelBall3D = dynamic(
  () => import("@/components/three/PadelBall3D").then((m) => m.PadelBall3D),
  { ssr: false }
);

/**
 * Full-bleed, image-forward hero: two padel panels behind a huge stacked
 * serif headline and a rectangular call to action — the reference's
 * dramatic split hero, rendered in the rose/wine club palette, with a
 * live 3D padel ball drifting over the corner.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero]", {
          y: 26,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.15,
        });
      });
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="full-bleed relative isolate -mt-8 overflow-hidden bg-court-950 text-white"
    >
      {/* Two-panel imagery: a padel action shot and a coach portrait */}
      <div className="absolute inset-0 grid grid-cols-1 sm:grid-cols-2">
        {/* LCP image: load it eagerly and at high priority. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/hero-poster.jpg"
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {/* Second panel only shows at sm+; lazy so phones don't download it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatars/carlos.jpg"
          alt=""
          width={800}
          height={800}
          loading="lazy"
          decoding="async"
          className="hidden h-full w-full object-cover object-top sm:block"
        />
      </div>

      {/* Unifying dark wash for legibility + a faint court-line grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-court-950/80 via-court-950/60 to-court-950/85" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(#fff3 1px, transparent 1px), linear-gradient(90deg, #fff3 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Live 3D padel ball, floating over the hero's lower-right corner.
          Desktop only: phones skip the WebGL download and battery cost. */}
      <PadelBall3D className="pointer-events-none absolute bottom-[6%] right-[4%] z-10 hidden h-56 w-56 lg:block xl:h-72 xl:w-72" />

      <div className="relative mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <p data-hero className="eyebrow text-ball-400">
          Film · Analyse · Improve
        </p>
        <h1
          data-hero
          className="mt-4 text-4xl leading-[1.06] sm:text-5xl lg:text-6xl [text-shadow:0_2px_30px_rgba(0,0,0,0.45)]"
        >
          Online padel coaching from your own match footage
        </h1>
        <p
          data-hero
          className="mt-6 max-w-xl text-lg leading-relaxed text-court-100"
        >
          Upload a match, choose a vetted coach, and get timestamped technical
          and tactical feedback within 24–72 hours.
        </p>
        <div data-hero className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/coaches"
            className="rounded-sm bg-ball-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-court-950 transition hover:bg-ball-400"
          >
            Get my first video review
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-sm border border-white/40 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10"
          >
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}
