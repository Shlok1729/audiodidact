"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Helper to speak with browser female voice if audio fails
  const speakWithBrowserTTS = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = playbackSpeed;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("samantha") ||
        v.name.toLowerCase().includes("victoria") ||
        v.name.toLowerCase().includes("karen") ||
        v.name.toLowerCase().includes("zira") ||
        v.name.toLowerCase().includes("natural")
    );
    if (femaleVoice) utt.voice = femaleVoice;
    utt.onend = () => {
      if (currentStepIndex < steps.length - 1) {
        onNext();
      } else {
        onPlayPause();
      }
    };
    window.speechSynthesis.speak(utt);
  }, [playbackSpeed, currentStepIndex, steps.length, onNext, onPlayPause]);

  // Synchronize audio playback with isPlaying and currentStep
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentStep?.audioUrl) return;

    audio.playbackRate = playbackSpeed;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setAudioError(true);
          if (currentStep?.text) {
            speakWithBrowserTTS(currentStep.text);
          }
        });
      }
    } else {
      audio.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isPlaying, currentStep, playbackSpeed, speakWithBrowserTTS]);

  // When step changes, reset time and continue playback if isPlaying
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      setAudioError(false);
      if (isPlaying) {
        audio.play().catch(() => {
          if (currentStep?.text) {
            speakWithBrowserTTS(currentStep.text);
          }
        });
      }
    }
  }, [currentStepIndex, isPlaying, currentStep, speakWithBrowserTTS]);

  // Update playback speed dynamically
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Audio event listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    if (currentStepIndex < steps.length - 1) {
      onNext();
    } else {
      onPlayPause(); // pause when tour finishes
    }
  };

  // Global keyboard shortcuts (Section 15: keyboard-only navigation)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

  // Voice badge colors (Electric Violet & Cyber Cyan palette)
  const voiceBadgeStyles: Record<string, string> = {
    narrator: "bg-violet-950/90 text-violet-300 border-violet-700/80 shadow-sm shadow-violet-900/20",
    frontend: "bg-cyan-950/90 text-cyan-300 border-cyan-700/80 shadow-sm shadow-cyan-900/20",
    backend: "bg-purple-950/90 text-purple-300 border-purple-700/80 shadow-sm shadow-purple-900/20",
    data: "bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-700/80 shadow-sm shadow-fuchsia-900/20",
  };

  const layerBadgeStyles: Record<string, string> = {
    frontend: "bg-cyan-950/60 text-cyan-300 border-cyan-800/80",
    backend: "bg-violet-950/60 text-violet-300 border-violet-800/80",
    data: "bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-800/80",
    infra: "bg-indigo-950/60 text-indigo-300 border-indigo-800/80",
    external: "bg-rose-950/60 text-rose-300 border-rose-800/80",
    other: "bg-slate-900 text-slate-300 border-slate-800",
  };

  return (
    <section
      aria-label="Tour Audio and Step Player"
      className="bg-[#0c101d]/90 backdrop-blur-2xl border border-violet-900/50 rounded-2xl p-5 shadow-2xl shadow-violet-950/40 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Hidden audio element wired to current step's audioUrl */}
      {currentStep.audioUrl && (
        <audio
          ref={audioRef}
          src={currentStep.audioUrl}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          onError={() => setAudioError(true)}
          className="sr-only"
          aria-label={`Audio playback for ${currentStep.voiceKey} voice narration`}
        />
      )}

      {/* Header with Diagram title, Step counter, and Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-950/80 pb-4 mb-4 relative z-10">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-cyan-400 block mb-1">
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
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center space-x-1.5 ${
              voiceBadgeStyles[currentStep.voiceKey] || voiceBadgeStyles.narrator
            }`}
          >
            {isPlaying && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            )}
            <span>Voice: {currentStep.voiceKey}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar & Indicators */}
      <div className="space-y-1.5 mb-5 relative z-10">
        <div className="flex justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center space-x-2">
            {duration > 0 && (
              <span className="font-mono text-cyan-400 font-semibold">
                {Math.floor(currentTime)}s / {Math.floor(duration)}s
              </span>
            )}
            <span className="text-slate-400">
              {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuenow={currentStepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Tour progress"
          className="w-full bg-[#060814] rounded-full h-2 overflow-hidden border border-violet-950"
        >
          <div
            className="bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 h-2 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-400/50"
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
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800/80 text-slate-200 font-medium text-xs transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            ← Prev
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause tour audio (Shortcut: Space)" : "Play tour audio (Shortcut: Space)"}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center space-x-2"
          >
            {isPlaying ? (
              <>
                <span className="w-2 h-2 rounded-sm bg-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <span className="text-sm">▶</span>
                <span>Play Tour</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentStepIndex === steps.length - 1}
            aria-label="Next step (Shortcut: Right Arrow or ])"
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800/80 text-slate-200 font-medium text-xs transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Next →
          </button>

          {/* Drill Down Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={onDrillDown}
              aria-label="Drill down into connected components (Shortcut: D)"
              className="px-3 py-2 rounded-xl bg-violet-950/80 hover:bg-violet-900 text-violet-300 font-medium text-xs transition-colors border border-violet-700/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              🔍 Drill Down (D)
            </button>
          )}
        </div>

        {/* Modern Segmented Speed Pills */}
        <div className="flex items-center space-x-1.5 text-xs bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <span className="text-slate-500 font-medium px-1.5 text-[11px]">Speed</span>
          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onSpeedChange(spd)}
              aria-label={`Set speed to ${spd}x`}
              className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold transition-colors ${
                playbackSpeed === spd
                  ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-sm shadow-violet-900/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {spd}x
            </button>
          ))}
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
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">Space</kbd> Play/Pause</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">← / [</kbd> Previous</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">→ / ]</kbd> Next</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">D</kbd> Drill Down</span>
        <span><kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">V</kbd> Voice Query</span>
      </div>
    </section>
  );
}
