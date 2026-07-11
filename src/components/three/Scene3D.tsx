"use client";

import dynamic from "next/dynamic";

/**
 * Client-side wrapper for 3D content: loads three.js only in the browser
 * (never during SSR) and shows nothing until it's ready, so pages stay
 * fast and server-renderable. Use this anywhere a page needs 3D.
 */
const PadelScene = dynamic(() => import("./PadelScene"), {
  ssr: false,
  loading: () => null,
});

export function Scene3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <PadelScene />
    </div>
  );
}
