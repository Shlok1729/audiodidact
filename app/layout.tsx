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
      <body className="bg-[#060812] text-slate-100 flex flex-col min-h-screen selection:bg-violet-600 selection:text-white">
        {/* Skip to main content for screen readers and keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Skip to main content
        </a>

        {/* Global Navigation Header */}
        <header
          role="banner"
          className="border-b border-violet-950/60 bg-[#070914]/80 backdrop-blur-xl sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" role="img" aria-label="Headphones icon">
                🎧
              </span>
              <Link
                href="/"
                className="text-xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 hover:opacity-90 transition-opacity focus:ring-2 focus:ring-cyan-400 focus:outline-none rounded px-1"
              >
                Audiodidact
              </Link>
              <span className="text-xs bg-violet-950/80 text-violet-300 font-medium px-2.5 py-0.5 rounded-full border border-violet-800/60 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
                <span>AI Studio Voice Tour</span>
              </span>
            </div>

            <nav role="navigation" aria-label="Main Navigation">
              <ul className="flex items-center space-x-4 text-sm font-medium">
                <li>
                  <Link
                    href="/"
                    className="text-slate-300 hover:text-cyan-300 px-3 py-1.5 rounded transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tour/audiodidact/demo"
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-violet-600/25 focus:ring-2 focus:ring-cyan-400 focus:outline-none font-semibold text-xs sm:text-sm"
                  >
                    Start Demo Tour
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
          className="border-t border-violet-950/60 bg-[#060812] py-8 text-center text-xs text-slate-400"
        >
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p className="text-slate-300 font-medium">
              Audiodidact is an accessible onboarding assistant for blind and visually impaired developers.
            </p>
            <p className="text-slate-500 text-[11px]">
              Engineered with Electric Violet & Cyber Cyan Audio Architecture • Powered by ElevenLabs Multi-Voice Narration.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
