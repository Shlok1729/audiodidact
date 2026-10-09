"use client";

import React, { useState } from "react";
import { TourStep } from "@/lib/schema";

interface TranscriptProps {
  currentStep: TourStep;
  stepNumber: number;
  totalSteps: number;
}

export default function Transcript({
  currentStep,
  stepNumber,
  totalSteps,
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
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400 font-bold text-sm tracking-wide uppercase">
            Transcript
          </span>
          <span className="text-xs text-slate-400">
            (Step {stepNumber} of {totalSteps})
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy transcript text to clipboard"
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>

      {/* Live region for screen readers (polite so it announces updates without interrupting) */}
      <div
        role="region"
        aria-live="polite"
        aria-atomic="true"
        className="text-slate-100 text-base sm:text-lg leading-relaxed font-normal min-h-[90px] flex items-center bg-slate-950/60 p-4 rounded-lg border border-slate-800/80"
      >
        <p className="selection:bg-blue-600 selection:text-white">
          {currentStep.text}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          Spoken by: <strong className="text-slate-300 capitalize">{currentStep.voiceKey} voice</strong>
        </span>
        <span>
          Context: <span className="text-slate-300 capitalize">{currentStep.layer} layer</span>
        </span>
      </div>
    </section>
  );
}
