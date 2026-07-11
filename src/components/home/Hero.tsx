"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Scene3D } from "@/components/three/Scene3D";

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
      });
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-3xl bg-court-950 px-6 py-16 text-white sm:px-12 sm:py-20"
    >
      {/* Court lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(#fff3 1px, transparent 1px), linear-gradient(90deg, #fff3 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <p data-hero className="eyebrow text-ball-400">
            Padel video analysis · coaching marketplace
          </p>
          <h1
            data-hero
            className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-[3.4rem]"
          >
            Hire a professional coach to review your padel game
          </h1>
          <p data-hero className="mt-5 max-w-xl text-lg text-court-200">
            Film your match on any phone and upload it. The coach you choose
            watches your play and sends back detailed, personal analysis —
            technique, positioning, tactics.
          </p>
          <div data-hero className="mt-8 flex flex-wrap gap-3">
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
                <span className="text-ball-400">{coachCount}</span> verified{" "}
                {coachCount === 1 ? "coach" : "coaches"}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Starting price</dt>
              <dd>
                Reviews from <span className="text-ball-400">{fromPrice}</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Coach earnings</dt>
              <dd>
                Coaches keep <span className="text-ball-400">80%</span>
              </dd>
            </div>
          </dl>
        </div>
        <div data-hero className="h-[260px] w-full sm:h-[320px] lg:h-[400px]">
          <Scene3D className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}
