"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/Shlok1729/scout-OG");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsLoading(true);
    const cleaned = repoUrl.trim().replace(/^https?:\/\/github\.com\//, "");
    const parts = cleaned.split("/").filter(Boolean);
    const repoPath = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "Shlok1729/scout-OG";

    router.push(`/tour/${repoPath}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      {/* Hero section */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center space-x-2 bg-violet-950/80 border border-violet-800/80 text-violet-300 text-xs px-3.5 py-1 rounded-full font-medium shadow-md shadow-violet-950/40">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Electric Violet & Cyber Cyan Audio Engine</span>
          <span>•</span>
          <span>Multi-Voice Narration</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Understand any open-source repo{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-400">
            by ear
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Audiodidact converts architecture pipelines and ER schemas into an interactive, voice-navigable audio tour
          so developers can build a mental model of any codebase through spoken sound.
        </p>
      </div>

      {/* Repo Input Card */}
      <section
        aria-label="Repository Selection Form"
        className="bg-[#0c101d]/90 backdrop-blur-2xl border border-violet-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-violet-950/50 max-w-2xl mx-auto relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label
              htmlFor="repo-input"
              className="block text-sm font-bold text-slate-200 mb-2 flex items-center justify-between"
            >
              <span>GitHub Repository URL or Slug</span>
              <span className="text-xs font-normal text-cyan-400">Public or Forked Repos</span>
            </label>
            <div className="relative">
              <input
                id="repo-input"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
                className="w-full bg-[#060814] border border-violet-900/60 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm font-mono transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-600/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? "Generating Multi-Voice Tour..." : "Generate Audio Tour →"}</span>
          </button>
        </form>

        {/* Quick Launch Buttons */}
        <div className="mt-6 pt-5 border-t border-violet-950/80 text-xs text-slate-400 relative z-10">
          <span className="font-semibold text-slate-300 block mb-2.5">
            Quick Launch Repositories:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRepoUrl("https://github.com/Shlok1729/scout-OG");
                router.push("/tour/Shlok1729/scout-OG");
              }}
              className="px-3 py-1.5 rounded-xl bg-violet-950/60 hover:bg-violet-900/80 text-violet-200 border border-violet-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium text-xs flex items-center space-x-1.5"
            >
              <span>⚡</span>
              <span>Shlok1729/scout-OG (Real Pipeline)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRepoUrl("https://github.com/audiodidact/demo");
                router.push("/tour/audiodidact/demo");
              }}
              className="px-3 py-1.5 rounded-xl bg-[#12162a] hover:bg-[#1a203a] text-slate-300 border border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium text-xs"
            >
              🚀 audiodidact/demo
            </button>
            <button
              type="button"
              onClick={() => {
                setRepoUrl("https://github.com/facebook/react");
                router.push("/tour/facebook/react");
              }}
              className="px-3 py-1.5 rounded-xl bg-[#12162a] hover:bg-[#1a203a] text-slate-300 border border-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 font-medium text-xs"
            >
              ⚛️ facebook/react
            </button>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section
        aria-label="Core Features Overview"
        className="grid sm:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto"
      >
        <div className="bg-[#0b0f1e]/80 backdrop-blur-xl border border-violet-950/80 rounded-2xl p-5 hover:border-violet-700/60 transition-colors">
          <div className="text-2xl mb-2">🖼️ ➔ 🕸️</div>
          <h2 className="text-base font-bold text-white mb-1">Architecture Reader</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Extracts architecture diagrams and markdown pipeline specs into a structured, faithful graph model.
          </p>
        </div>

        <div className="bg-[#0b0f1e]/80 backdrop-blur-xl border border-violet-950/80 rounded-2xl p-5 hover:border-cyan-700/60 transition-colors">
          <div className="text-2xl mb-2">🗣️ ➔ 🎧</div>
          <h2 className="text-base font-bold text-white mb-1">Multi-Voice Personas</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Distinct female voices for frontend, backend, and data layers keep mental context clear as you navigate.
          </p>
        </div>

        <div className="bg-[#0b0f1e]/80 backdrop-blur-xl border border-violet-950/80 rounded-2xl p-5 hover:border-purple-700/60 transition-colors">
          <div className="text-2xl mb-2">⌨️ ➔ ♿</div>
          <h2 className="text-base font-bold text-white mb-1">100% Accessible</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full tree outline, live polite transcript, single-key navigation, and WCAG AA contrast.
          </p>
        </div>
      </section>
    </div>
  );
}
