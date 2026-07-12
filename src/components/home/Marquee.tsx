const ITEMS = [
  "Curated coaches",
  "Feedback in days",
  "Written + video analysis",
  "Set your own focus",
  "Verified professionals",
  "One-off or monthly",
];

/**
 * Full-bleed scrolling ticker — the reference's marquee, in court green.
 * The list is duplicated so the -50% translation loops seamlessly; the
 * animation is disabled under prefers-reduced-motion.
 */
export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="full-bleed overflow-hidden border-y border-court-800 bg-court-950 py-4 text-white">
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap pl-10 motion-reduce:animate-none">
        {row.map((item, i) => (
          <span
            key={i}
            // The list is duplicated only for the visual loop — hide the
            // second copy from screen readers so items aren't read twice.
            aria-hidden={i >= ITEMS.length}
            className="flex items-center gap-10 text-sm font-semibold uppercase tracking-[0.22em] text-court-100"
          >
            {item}
            <span className="text-ball-500" aria-hidden>
              ●
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
