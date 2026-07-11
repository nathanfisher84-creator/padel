import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="eyebrow text-court-600">Out of bounds</p>
      <h1 className="mt-3 text-4xl">This page isn&apos;t on the court</h1>
      <p className="mt-4 text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/coaches" className="btn-secondary">
          Browse coaches
        </Link>
      </div>
    </div>
  );
}
