"use client";

import React, { useState } from "react";
import { TourStep } from "@/lib/schema";

interface TranscriptProps {
  currentStep: TourStep;
  stepNumber: number;
  totalSteps: number;
  isPlaying?: boolean;
}

export default function Transcript({
  currentStep,
  stepNumber,
  totalSteps,
  isPlaying = false,
}: TranscriptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentStep.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API not permitted
    }
  };

  return (
    <section
      aria-label="Live Spoken Tour Transcript"
      className={`bg-slate-900/90 backdrop-blur-md border rounded-xl p-5 shadow-xl relative transition-all ${
        isPlaying
          ? "border-cyan-500/80 shadow-cyan-950/50 ring-1 ring-cyan-500/20"
          : "border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400 font-bold text-sm tracking-wide uppercase flex items-center space-x-1.5">
            {isPlaying && (
              <span className="flex space-x-0.5 items-end h-3 w-3">
                <span className="w-0.5 bg-cyan-400 h-full animate-bounce" />
                <span className="w-0.5 bg-cyan-400 h-2/3 animate-bounce [animation-delay:0.1s]" />
                <span className="w-0.5 bg-cyan-400 h-full animate-bounce [animation-delay:0.2s]" />
              </span>
            )}
            <span>Live Transcript</span>
          </span>
          <span className="text-xs text-slate-400">
            (Step {stepNumber} of {totalSteps})
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy transcript text to clipboard"
          className="text-xs px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>

      {/* Live region for screen readers (polite so it announces updates without interrupting) */}
      <div
        role="region"
        aria-live="polite"
        aria-atomic="true"
        className={`text-slate-100 text-base sm:text-lg leading-relaxed font-normal min-h-[90px] flex items-center p-4 rounded-lg border transition-all ${
          isPlaying
            ? "bg-slate-950/90 border-violet-500/60 ring-1 ring-violet-500/30"
            : "bg-slate-950/60 border-slate-800/80"
        }`}
      >
        <p className="selection:bg-violet-600 selection:text-white">
          {currentStep.text}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center space-x-1.5">
          <span>Spoken by:</span>
          <strong className="text-slate-200 capitalize font-medium">
            {currentStep.voiceKey} voice
          </strong>
          {isPlaying && (
            <span className="text-emerald-400 font-medium text-[11px]">
              • Now Playing
            </span>
          )}
        </span>
        <span>
          Context: <span className="text-slate-300 capitalize">{currentStep.layer} layer</span>
        </span>
      </div>
    </section>
  );
}
