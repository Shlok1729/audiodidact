"use client";

import React, { useEffect, useCallback } from "react";
import { TourStep, DiagramGraph } from "@/lib/schema";

interface PlayerProps {
  tourId: string;
  steps: TourStep[];
  currentStepIndex: number;
  diagrams: DiagramGraph[];
  isPlaying: boolean;
  playbackSpeed: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelectStepIndex: (index: number) => void;
  onDrillDown: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function Player({
  tourId,
  steps,
  currentStepIndex,
  diagrams,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onNext,
  onPrevious,
  onSelectStepIndex,
  onDrillDown,
  onSpeedChange,
}: PlayerProps) {
  const currentStep = steps[currentStepIndex];
  const currentDiagram = diagrams.find((d) => d.id === currentStep?.diagramId);
  const hasChildren = currentStep && currentStep.children && currentStep.children.length > 0;

  // Global keyboard shortcuts (Section 15: keyboard-only navigation)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Do not trigger shortcuts if the user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
      } else if (e.code === "ArrowRight" || e.key === "]") {
        e.preventDefault();
        onNext();
      } else if (e.code === "ArrowLeft" || e.key === "[") {
        e.preventDefault();
        onPrevious();
      } else if (e.key === "d" || e.key === "D") {
        if (hasChildren) {
          e.preventDefault();
          onDrillDown();
        }
      }
    },
    [onPlayPause, onNext, onPrevious, onDrillDown, hasChildren]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!currentStep) {
    return (
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-center text-slate-400">
        No tour steps loaded.
      </div>
    );
  }

  // Voice badge colors
  const voiceBadgeStyles: Record<string, string> = {
    narrator: "bg-purple-950/80 text-purple-300 border-purple-800",
    frontend: "bg-sky-950/80 text-sky-300 border-sky-800",
    backend: "bg-emerald-950/80 text-emerald-300 border-emerald-800",
    data: "bg-amber-950/80 text-amber-300 border-amber-800",
  };

  const layerBadgeStyles: Record<string, string> = {
    frontend: "bg-blue-900/40 text-blue-300 border-blue-700",
    backend: "bg-emerald-900/40 text-emerald-300 border-emerald-700",
    data: "bg-amber-900/40 text-amber-300 border-amber-700",
    infra: "bg-orange-900/40 text-orange-300 border-orange-700",
    external: "bg-rose-900/40 text-rose-300 border-rose-700",
    other: "bg-slate-800 text-slate-300 border-slate-700",
  };

  return (
    <section
      aria-label="Tour Audio and Step Player"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl"
    >
      {/* Header with Diagram title, Step counter, and Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-400 block mb-1">
            {currentDiagram?.type.toUpperCase()} DIAGRAM
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {currentDiagram?.title || "Tour Overview"}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Layer Badge */}
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              layerBadgeStyles[currentStep.layer] || layerBadgeStyles.other
            }`}
          >
            Layer: {currentStep.layer}
          </span>

          {/* Voice Key Badge */}
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
              voiceBadgeStyles[currentStep.voiceKey] || voiceBadgeStyles.narrator
            }`}
          >
            Voice: {currentStep.voiceKey}
          </span>
        </div>
      </div>

      {/* Progress Bar & Indicators */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span>
            {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={currentStepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Tour progress"
          className="w-full bg-slate-800 rounded-full h-2 overflow-hidden"
        >
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Step Navigation Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={currentStepIndex === 0}
            aria-label="Previous step (Shortcut: Left Arrow or [)"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-medium text-sm transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            ← Previous
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause tour (Shortcut: Space)" : "Play tour (Shortcut: Space)"}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-md shadow-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center space-x-2"
          >
            <span>{isPlaying ? "⏸ Pause" : "▶ Play"}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentStepIndex === steps.length - 1}
            aria-label="Next step (Shortcut: Right Arrow or ])"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-medium text-sm transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Next →
          </button>

          {/* Drill Down Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={onDrillDown}
              aria-label="Drill down into connected components (Shortcut: D)"
              className="px-3.5 py-2 rounded-lg bg-indigo-900/70 hover:bg-indigo-800/80 text-indigo-200 font-medium text-sm transition-colors border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              🔍 Drill Down (D)
            </button>
          )}
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <label htmlFor="playback-speed-select" className="text-slate-400 font-medium">
            Speed:
          </label>
          <select
            id="playback-speed-select"
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>

      {/* Model Confidence & Warnings Notice */}
      {currentDiagram && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Model confidence:</span>
            <span className="font-semibold text-emerald-400">
              {Math.round(currentDiagram.confidence * 100)}%
            </span>
          </div>
          {currentDiagram.warnings.length > 0 && (
            <div className="text-amber-400 flex items-center space-x-1">
              <span>⚠️ Note: {currentDiagram.warnings.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Documentation Help */}
      <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/60 rounded px-2.5 py-1 border border-slate-800/40 flex flex-wrap gap-x-4 gap-y-1">
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Space</kbd> Play/Pause</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">← / [</kbd> Previous</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">→ / ]</kbd> Next</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">D</kbd> Drill Down</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">V</kbd> Voice Query</span>
      </div>
    </section>
  );
}
