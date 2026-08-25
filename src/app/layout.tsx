import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Fraunces } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { getSession } from "@/lib/auth";
import { StopImpersonatingButton } from "@/components/StopImpersonatingButton";

// Archivo carries every word of UI and body copy — a sturdy, professional
// grotesque with real character at display weights. Fraunces is the
// editorial voice: a soft, high-contrast serif that gives the marketplace
// a considered, premium register. Both are variable fonts (one file each).
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PadelPro Coaching",
  url: process.env.APP_URL ?? "https://www.padelprocoaches.com",
  description:
    "A marketplace connecting padel players with professional coaches for personal video analysis.",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://www.padelprocoaches.com"),
  title: {
    default: "PadelPro Coaching — video analysis by top padel coaches",
    template: "%s · PadelPro Coaching",
  },
  description:
    "Upload your padel match or training videos and get personal feedback from professional coaches. Feedback in days, not weeks.",
  openGraph: {
    siteName: "PadelPro Coaching",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  // Installed-app behaviour (Add to Home Screen): standalone, titled, and
  // with the status bar blending into the dark top banner on iOS.
  appleWebApp: {
    capable: true,
    title: "PadelPro",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#38181f",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className={`${archivo.variable} ${fraunces.variable} font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {session?.impersonatorId && (
          <div className="bg-amber-400 text-amber-950">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
              <span>
                Admin preview — you&rsquo;re viewing the site as{" "}
                <strong>{session.name}</strong> ({session.role.toLowerCase()}).
              </span>
              <StopImpersonatingButton />
            </div>
          </div>
        )}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-court-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <div className="bg-court-950 text-white">
          <p className="mx-auto max-w-6xl px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-court-100">
            Curated padel coaches · Feedback in days, not weeks · Now accepting
            new players
          </p>
        </div>
        <NavBar />
        <main
          id="main"
          className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl px-4 py-8"
        >
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-court-950 text-court-100">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-2 text-lg font-bold text-white">
                <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
                  <circle cx="32" cy="32" r="27" fill="#d9b873" />
                  <path d="M13 15 C30 26 34 38 51 49" stroke="#38181f" strokeWidth="6.5" fill="none" strokeLinecap="round" />
                  <path d="M51 15 C34 26 30 38 13 49" stroke="#fffefa" strokeWidth="6.5" fill="none" strokeLinecap="round" />
                </svg>
                <span>
                  Padel<span className="text-ball-400">Pro</span>
                </span>
              </p>
              <p className="mt-3 max-w-xs text-sm text-court-300">
                Video analysis by professional padel coaches. Film your match,
                choose your coach, improve your game.
              </p>
            </div>
            <div>
              <p className="eyebrow text-court-400">For players</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/coaches" className="hover:text-white">
                    Browse coaches
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white">
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="eyebrow text-court-400">For coaches</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/register?role=coach" className="hover:text-white">
                    Join as a coach
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Coach dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/coach-terms" className="hover:text-white">
                    Coach Agreement
                  </Link>
                </li>
              </ul>
              <p className="stat mt-4 text-sm text-ball-400">
                Join free — coach players worldwide
              </p>
            </div>
          </div>
          <div className="border-t border-court-900">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-court-400 sm:flex-row">
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                © {new Date().getFullYear()} PadelPro Coaching
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
              </span>
              <span className="eyebrow">Improve your game, one video at a time</span>
            </div>
            {/* Legal-entity disclosure: payment providers (e.g. Stripe KYC)
                match the website to the licensed entity via this line. Full
                registered details (licence no., address) live on /terms. */}
            <p className="mx-auto max-w-6xl px-4 pb-5 text-center text-[11px] leading-relaxed text-court-400/80 sm:text-left">
              Operated by Hello Maya Events FZ-LLC (UAE).
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
