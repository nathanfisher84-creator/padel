"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";

/**
 * A real-time 3D padel ball rendered with WebGL (three.js via
 * react-three-fiber) — champagne felt with rose seams, slowly turning and
 * drifting, leaning gently toward the pointer.
 *
 * This file doubles as the pattern for any future 3D work on the site:
 * build the scene as a child of <Canvas>, keep it decorative
 * (aria-hidden, pointer-events-none wrapper), respect reduced motion, and
 * mount it with next/dynamic + ssr:false so three.js never enters the
 * server bundle. See design-system/patterns/3d.html.
 */

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function Ball({ animate }: { animate: boolean }) {
  const group = useRef<Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current || !animate) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * 0.35 + pointer.x * 0.4;
    group.current.rotation.x = 0.3 + pointer.y * -0.25;
    group.current.position.y = Math.sin(t * 0.9) * 0.1;
  });

  return (
    <group ref={group} rotation={[0.3, 0.6, 0]}>
      {/* Felt body */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#e4ca90" roughness={0.62} />
      </mesh>
      {/* Two crossed seams, hugging the surface */}
      <mesh rotation={[Math.PI / 2.4, 0.5, 0]}>
        <torusGeometry args={[0.985, 0.028, 16, 160]} />
        <meshStandardMaterial color="#a45162" roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, -0.5, Math.PI / 2]}>
        <torusGeometry args={[0.985, 0.028, 16, 160]} />
        <meshStandardMaterial color="#a45162" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function PadelBall3D({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.1], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        {/* Warm key light, soft blush fill, cream ambient — the scene is lit
            with the site's own palette so the ball sits in the page. */}
        <ambientLight intensity={0.85} color="#fcfaf4" />
        <directionalLight position={[4, 5, 6]} intensity={1.5} />
        <directionalLight position={[-5, -2, -4]} intensity={0.5} color="#f0d4d8" />
        <Ball animate={!reduced} />
      </Canvas>
    </div>
  );
}
