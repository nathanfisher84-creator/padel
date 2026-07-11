import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  axes: ["wdth"],
});
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PadelPro Coaching — video analysis by top padel coaches",
  description:
    "Upload your padel match or training videos and get personal feedback from professional coaches. Coaches join free and set their own rates.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${splineMono.variable} font-sans`}>
        <NavBar />
        <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-court-950 text-court-100">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
            <div>
              <p className="text-lg font-bold text-white">
                Padel<span className="text-ball-400">Pro</span>
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
              </ul>
              <p className="stat mt-4 text-sm text-ball-400">
                Coaches keep 80% of every payment
              </p>
            </div>
          </div>
          <div className="border-t border-court-900">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-court-400 sm:flex-row">
              <span>© {new Date().getFullYear()} PadelPro Coaching</span>
              <span className="eyebrow">Improve your game, one video at a time</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
