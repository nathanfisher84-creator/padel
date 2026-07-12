import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export async function NavBar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
<svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
            <circle cx="32" cy="32" r="27" fill="#cfe23f" />
            <path d="M13 15 C30 26 34 38 51 49" stroke="#10241a" strokeWidth="6.5" fill="none" strokeLinecap="round" />
            <path d="M51 15 C34 26 30 38 13 49" stroke="#fffefa" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          </svg>
          <span style={{ fontStretch: "115%" }}>
            Padel<span className="text-court-700">Pro</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/coaches"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Find a coach
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <span className="hidden text-sm text-slate-600 sm:inline">
                {session.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
