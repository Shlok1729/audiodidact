"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/audiodidact/demo");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsLoading(true);
    const cleaned = repoUrl.trim().replace(/^https?:\/\/github\.com\//, "");
    const parts = cleaned.split("/").filter(Boolean);
    const repoPath = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "audiodidact/demo";

    router.push(`/tour/${repoPath}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      {/* Hero section */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center space-x-2 bg-blue-950/60 border border-blue-800 text-blue-300 text-xs px-3 py-1 rounded-full font-medium">
          <span>🎧 Audiodidact Phase 1</span>
          <span>•</span>
          <span>Keyboard-Accessible Mock Tour</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Understand any open-source repo <span className="text-blue-400">by ear</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Audiodidact converts architecture and ER diagrams into a spoken, voice-navigable tour
          so blind and visually impaired developers can build a mental model of the system and make their first contribution.
        </p>
      </div>

      {/* Repo Input Card */}
      <section
        aria-label="Repository Selection Form"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-2xl mx-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="repo-input"
              className="block text-sm font-semibold text-slate-200 mb-2"
            >
              GitHub Repository URL
            </label>
            <div className="relative">
              <input
                id="repo-input"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-mono"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              For Phase 1 testing, pre-warmed fixtures are loaded automatically.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {isLoading ? "Loading Tour..." : "Start Architecture Tour →"}
          </button>
        </form>

        {/* Quick Launch Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400">
          <span className="font-semibold text-slate-300 block mb-2">
            Try Demo Repositories:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setRepoUrl("https://github.com/audiodidact/demo");
                router.push("/tour/audiodidact/demo");
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-xs"
            >
              🚀 audiodidact/demo (Architecture + ER)
            </button>
            <button
              type="button"
              onClick={() => {
                setRepoUrl("https://github.com/facebook/react");
                router.push("/tour/facebook/react");
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-xs"
            >
              ⚛️ facebook/react
            </button>
            <button
              type="button"
              onClick={() => {
                setRepoUrl("https://github.com/vercel/next.js");
                router.push("/tour/vercel/next.js");
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium text-xs"
            >
              ▲ vercel/next.js
            </button>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section
        aria-label="Core Features Overview"
        className="grid sm:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto"
      >
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="text-2xl mb-2">🖼️ ➔ 🕸️</div>
          <h2 className="text-base font-bold text-white mb-1">Gemma Diagram Reader</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Extracts services, databases, layers, and edges into a faithful graph model without visual placeholders.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="text-2xl mb-2">🗣️ ➔ 🎧</div>
          <h2 className="text-base font-bold text-white mb-1">Multi-Voice Narration</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Distinct voices for frontend, backend, and data layers keep mental context clear as you navigate.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="text-2xl mb-2">⌨️ ➔ ♿</div>
          <h2 className="text-base font-bold text-white mb-1">100% Keyboard Accessible</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full tree outline, live polite transcript, and single-key navigation designed for screen readers and keyboard users.
          </p>
        </div>
      </section>
    </div>
  );
}
