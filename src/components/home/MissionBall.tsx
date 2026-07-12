"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * The padel ball in the mission band, made interactive:
 *  - ambient float + a slowly breathing glow
 *  - 3D tilt that follows the cursor across the whole band
 *  - a gentle grow on hover
 *  - a spin-and-bounce when you click/tap it (like hitting the ball)
 *
 * All motion is gated behind prefers-reduced-motion; the image still renders
 * server-side, so it's visible without JavaScript.
 */
export function MissionBall() {
  const scope = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLImageElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const spinning = useRef(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Ambient: the ball drifts up and down; the glow breathes.
        gsap.to(ball.current, {
          y: -14,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to(glow.current, {
          scale: 1.34,
          opacity: 1,
          duration: 2.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });

        // Cursor tilt: the ball leans toward the pointer anywhere in the band.
        const region = scope.current?.closest("section") ?? scope.current;
        const rotX = gsap.quickTo(wrap.current, "rotationX", {
          duration: 0.6,
          ease: "power3",
        });
        const rotY = gsap.quickTo(wrap.current, "rotationY", {
          duration: 0.6,
          ease: "power3",
        });

        const onMove = (e: PointerEvent) => {
          const r = scope.current!.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const nx = gsap.utils.clamp(-1, 1, (e.clientX - cx) / (r.width * 1.2));
          const ny = gsap.utils.clamp(-1, 1, (e.clientY - cy) / (r.height * 1.2));
          rotY(nx * 16);
          rotX(-ny * 16);
        };
        const onLeave = () => {
          rotY(0);
          rotX(0);
        };

        region?.addEventListener("pointermove", onMove);
        region?.addEventListener("pointerleave", onLeave);
        return () => {
          region?.removeEventListener("pointermove", onMove);
          region?.removeEventListener("pointerleave", onLeave);
        };
      });
    },
    { scope }
  );

  function hover(on: boolean) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.to(ball.current, {
      scale: on ? 1.06 : 1,
      duration: 0.4,
      ease: "power2.out",
    });
  }

  function whack() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (spinning.current) return;
    spinning.current = true;
    gsap.to(ball.current, {
      rotation: "+=360",
      duration: 0.9,
      ease: "power2.out",
      onComplete: () => {
        spinning.current = false;
      },
    });
    // squash-and-stretch bounce
    gsap.fromTo(
      ball.current,
      { scale: 0.9 },
      { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.4)" }
    );
    // glow flash
    gsap.fromTo(
      glow.current,
      { scale: 1.5, opacity: 1 },
      { scale: 1.34, opacity: 0.85, duration: 0.6, ease: "power2.out" }
    );
  }

  return (
    <div
      ref={scope}
      className="relative mx-auto aspect-square w-full max-w-[300px] [perspective:900px] lg:max-w-[380px]"
    >
      <div
        ref={glow}
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-125 opacity-90"
        style={{
          background:
            "radial-gradient(circle, rgba(207,226,63,0.30) 0%, rgba(207,226,63,0.08) 45%, transparent 68%)",
        }}
      />
      <div ref={wrap} className="relative h-full w-full [transform-style:preserve-3d]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={ball}
          src="/media/hero-ball.webp"
          alt=""
          width={720}
          height={720}
          loading="lazy"
          decoding="async"
          draggable={false}
          onClick={whack}
          onPointerEnter={() => hover(true)}
          onPointerLeave={() => hover(false)}
          className="h-full w-full cursor-pointer select-none"
        />
      </div>
    </div>
  );
}
