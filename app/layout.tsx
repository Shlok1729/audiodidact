import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audiodidact — Understand Any Open-Source Repo By Ear",
  description:
    "Accessible diagram reader and voice-navigable tour generator for open-source repositories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        {/* Skip to main content for screen readers and keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>

        {/* Global Navigation Header */}
        <header
          role="banner"
          className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" role="img" aria-label="Headphones icon">
                🎧
              </span>
              <Link
                href="/"
                className="text-xl font-bold tracking-tight text-white hover:text-blue-400 transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none rounded px-1"
              >
                Audiodidact
              </Link>
              <span className="text-xs bg-blue-900/60 text-blue-300 font-medium px-2 py-0.5 rounded border border-blue-700/50">
                Phase 1 Mock Tour
              </span>
            </div>

            <nav role="navigation" aria-label="Main Navigation">
              <ul className="flex items-center space-x-4 text-sm font-medium">
                <li>
                  <Link
                    href="/"
                    className="text-slate-300 hover:text-white px-3 py-1.5 rounded transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tour/audiodidact/demo"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-md transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none font-semibold"
                  >
                    Start Tour
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        {/* Main Content Landmark */}
        <main id="main-content" role="main" className="flex-1">
          {children}
        </main>

        {/* Accessible Footer */}
        <footer
          role="contentinfo"
          className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-400"
        >
          <div className="max-w-7xl mx-auto px-4">
            <p>
              Audiodidact is an accessible onboarding assistant for blind and visually impaired developers.
            </p>
            <p className="mt-1 text-slate-500">
              Built with Next.js, TypeScript, Tailwind CSS, and Zod.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
