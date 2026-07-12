"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function Hero({
  coachCount,
  fromPrice,
}: {
  coachCount: number;
  fromPrice: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero]", {
          y: 26,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.09,
          delay: 0.1,
        });
        // Ambient float: the ball drifts and tilts slowly, forever.
        gsap.to("[data-ball]", {
          y: -14,
          rotation: 5,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.from("[data-hero-card]", {
          y: 30,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: 0.5,
        });
      });
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-[2rem] bg-court-950 px-6 py-16 text-white shadow-[0_30px_80px_-40px_rgba(16,36,26,0.7)] sm:px-12 sm:py-20"
    >
      {/* Court lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(#fff3 1px, transparent 1px), linear-gradient(90deg, #fff3 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Warm spotlight from the top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(207,226,63,0.5) 0%, transparent 70%)",
        }}
      />
      <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <p data-hero className="eyebrow text-ball-400">
            Padel video analysis · coaching marketplace
          </p>
          <h1
            data-hero
            className="mt-5 text-[2.6rem] leading-[1.03] sm:text-5xl lg:text-6xl"
          >
            Hire a professional to read your padel game.
          </h1>
          <p data-hero className="mt-6 max-w-xl text-lg leading-relaxed text-court-200">
            Film a match on your phone and choose your coach. They watch your
            play and send back a personal, shot-by-shot breakdown — technique,
            positioning, tactics. Feedback in days, not weeks.
          </p>
          <div data-hero className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/coaches"
              className="btn-primary !bg-ball-500 !text-court-950 hover:!bg-ball-400"
            >
              Browse coaches
            </Link>
            <Link
              href="/register?role=coach"
              className="btn-secondary !border-court-700 !bg-transparent !text-white hover:!bg-court-900"
            >
              Join as a coach
            </Link>
          </div>
          <dl
            data-hero
            className="stat mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-court-300"
          >
            <div>
              <dt className="sr-only">Coaches</dt>
              <dd>
                <span className="font-semibold text-ball-400">{coachCount}</span>{" "}
                verified {coachCount === 1 ? "coach" : "coaches"}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Starting price</dt>
              <dd>
                Reviews from{" "}
                <span className="font-semibold text-ball-400">{fromPrice}</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Plans</dt>
              <dd>One-off reviews &amp; monthly plans</dd>
            </div>
          </dl>
        </div>

        {/* The ball, staged in the space: soft chartreuse glow behind a
            cut-out photo, floating gently, with a feedback card overlaid to
            hint at the product you actually receive. */}
        <div
          data-hero
          className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[400px]"
        >
          <div
            aria-hidden
            className="absolute inset-0 scale-125"
            style={{
              background:
                "radial-gradient(circle, rgba(207,226,63,0.28) 0%, rgba(207,226,63,0.08) 45%, transparent 68%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-ball
            src="/media/hero-ball.png"
            alt=""
            className="relative h-full w-full select-none"
            draggable={false}
          />
          <div
            data-hero-card
            className="absolute -bottom-4 -left-4 w-56 rounded-2xl border border-white/10 bg-white/95 p-4 text-court-950 shadow-xl backdrop-blur sm:-left-8"
          >
            <p className="eyebrow text-court-600">Coach feedback</p>
            <p className="mt-1.5 text-sm font-medium leading-snug">
              “Your bandeja is landing short — stand a step deeper and drive
              through the ball.”
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="stat">Delivered in 2 days</span>
              <span className="text-ball-600">★★★★★</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
