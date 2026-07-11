"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

// Palette (kept in sync with tailwind.config.ts)
const BALL = "#cfe23f";
const CLUB = "#4b8765";
const BONE = "#d8cfba";
const CREAM = "#f8f4e9";

/** A glossy padel ball: blush sphere with a cream seam. */
function Ball() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.25;
    ref.current.rotation.x = Math.sin(t * 0.2) * 0.15;
    ref.current.position.y = Math.sin(t * 0.6) * 0.15;
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial color={BALL} roughness={0.25} metalness={0.05} />
      </mesh>
      {/* Ball seam */}
      <mesh rotation={[Math.PI / 2.6, 0.4, 0]}>
        <torusGeometry args={[1.505, 0.02, 16, 128]} />
        <meshStandardMaterial color={CREAM} roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2.6, -0.4, Math.PI / 2]}>
        <torusGeometry args={[1.505, 0.02, 16, 128]} />
        <meshStandardMaterial color={CREAM} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Large bone ring orbiting the ball. */
function Ring() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = Math.PI / 2.3 + Math.sin(t * 0.3) * 0.1;
    ref.current.rotation.z = t * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.3, 0, 0]}>
      <torusGeometry args={[2.5, 0.09, 24, 160]} />
      <meshStandardMaterial color={BONE} roughness={0.4} metalness={0.15} />
    </mesh>
  );
}

/** Small floating accent spheres. */
function Satellite({
  color,
  radius,
  distance,
  speed,
  phase,
  y,
}: {
  color: string;
  radius: number;
  distance: number;
  speed: number;
  phase: number;
  y: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(
      Math.cos(t) * distance,
      y + Math.sin(t * 1.7) * 0.25,
      Math.sin(t) * distance
    );
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

/** Gentle mouse parallax on the whole composition. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ pointer }) => {
    if (!ref.current) return;
    ref.current.rotation.y += (pointer.x * 0.25 - ref.current.rotation.y) * 0.05;
    ref.current.rotation.x += (-pointer.y * 0.15 - ref.current.rotation.x) * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Reusable 3D scene in the site palette. Drop into any page via the
 * <Scene3D /> wrapper (dynamic import, no SSR).
 */
export default function PadelScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 7.5], fov: 38 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} color={CREAM} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color={"#fff6ec"} />
      <pointLight position={[-5, -2, -4]} intensity={0.8} color={CLUB} />
      <Rig>
        <Ball />
        <Ring />
        <Satellite color={CREAM} radius={0.28} distance={3.3} speed={0.4} phase={0} y={0.9} />
        <Satellite color={CLUB} radius={0.18} distance={2.9} speed={0.55} phase={2.2} y={-0.8} />
        <Satellite color={BONE} radius={0.12} distance={3.6} speed={0.3} phase={4.1} y={0.2} />
      </Rig>
    </Canvas>
  );
}
