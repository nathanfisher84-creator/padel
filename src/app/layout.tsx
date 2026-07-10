import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <NavBar />
        <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row">
            <span>© {new Date().getFullYear()} PadelPro Coaching</span>
            <span>Improve your game, one video at a time.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
