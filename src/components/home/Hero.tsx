"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * Full-bleed, image-forward hero: two padel panels behind a huge stacked
 * Playfair headline and a rectangular call to action — the reference's
 * dramatic split hero, rendered in our court-green palette.
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

      <div className="relative mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center px-4 py-24 text-center">
        <h1
          data-hero
          className="text-5xl uppercase leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl [text-shadow:0_2px_30px_rgba(0,0,0,0.45)]"
        >
          Film.
          <br />
          Analyse.
          <br />
          Improve.
        </h1>
        <p
          data-hero
          className="mt-7 max-w-md text-lg leading-relaxed text-court-100"
        >
          Professional video coaching for padel players. Choose your coach,
          upload a match, and get a personal breakdown — feedback in days, not
          weeks.
        </p>
        <div data-hero className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/coaches"
            className="rounded-sm bg-ball-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-court-950 transition hover:bg-ball-400"
          >
            Browse coaches
          </Link>
          <Link
            href="/register?role=coach"
            className="rounded-sm border border-white/40 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/10"
          >
            Join as a coach
          </Link>
        </div>
      </div>
    </section>
  );
}
