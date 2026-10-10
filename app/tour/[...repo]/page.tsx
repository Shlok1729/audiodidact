"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import Player from "@/components/Player";
import Transcript from "@/components/Transcript";
import Outline from "@/components/Outline";
import VoiceButton from "@/components/VoiceButton";
import IssueList from "@/components/IssueList";
import {
  Tour,
  TourStep,
  DiagramGraph,
  AgentAnswer,
  AskResponse,
  GoodFirstIssue,
} from "@/lib/schema";
import { planTour } from "@/lib/narration";
import { fuzzyMatchNodeName } from "@/lib/intent";
import architectureFixture from "@/fixtures/architecture.json";
import erFixture from "@/fixtures/er.json";

interface PageProps {
  params: Promise<{ repo: string[] }> | { repo: string[] };
}

export default function TourPage({ params }: PageProps) {
  // Unwrap params (supports Next.js 14 & 15)
  const resolvedParams = "then" in params ? use(params as Promise<{ repo: string[] }>) : params;
  const repoSlug = Array.isArray(resolvedParams?.repo)
    ? resolvedParams.repo.join("/")
    : "audiodidact/demo";

  const [tour, setTour] = useState<Tour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [agentAnswer, setAgentAnswer] = useState<AskResponse | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [issues, setIssues] = useState<GoodFirstIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  // Load tour and issues
  useEffect(() => {
    async function loadTourData() {
      setIsLoading(true);
      try {
        // Fetch tour from /api/tour
        const tourRes = await fetch("/api/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoId: repoSlug }),
        });

        if (tourRes.ok) {
          const data: Tour = await tourRes.json();
          setTour(data);
        } else {
          // Client fallback to deterministic planTour
          const fallbackTour = planTour(repoSlug, [
            architectureFixture as any,
            erFixture as any,
          ]);
          setTour(fallbackTour);
        }

        // Fetch issues from /api/discover
        const discRes = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: `https://github.com/${repoSlug}` }),
        });
        if (discRes.ok) {
          const discData = await discRes.json();
          if (discData.goodFirstIssues) {
            setIssues(discData.goodFirstIssues);
          }
        }
      } catch (err) {
        // Fallback to local fixtures
        const fallbackTour = planTour(repoSlug, [
          architectureFixture as any,
          erFixture as any,
        ]);
        setTour(fallbackTour);
      } finally {
        setIsLoading(false);
      }
    }

    loadTourData();
  }, [repoSlug]);

  const currentStep: TourStep | undefined = tour?.steps[currentStepIndex];

  // Navigation callbacks
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (!tour) return;
    setCurrentStepIndex((prev) => Math.min(tour.steps.length - 1, prev + 1));
  }, [tour]);

  const handlePrevious = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSelectStepIndex = useCallback((index: number) => {
    setCurrentStepIndex(index);
  }, []);

  const handleDrillDown = useCallback(() => {
    if (!tour || !currentStep) return;
    if (currentStep.children && currentStep.children.length > 0) {
      const targetStepId = currentStep.children[0];
      const targetIdx = tour.steps.findIndex((s) => s.id === targetStepId);
      if (targetIdx !== -1) {
        setCurrentStepIndex(targetIdx);
        setStatusMessage(`Drilled down to step: ${tour.steps[targetIdx].text.slice(0, 40)}...`);
      }
    }
  }, [tour, currentStep]);

  const handleSelectNode = useCallback(
    (diagramId: string, nodeId?: string) => {
      if (!tour) return;
      const targetIdx = tour.steps.findIndex((s) => {
        if (nodeId) {
          return s.diagramId === diagramId && s.nodeId === nodeId;
        }
        return s.diagramId === diagramId && s.nodeId === undefined;
      });

      if (targetIdx !== -1) {
        setCurrentStepIndex(targetIdx);
      }
    },
    [tour]
  );

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    setStatusMessage(`Playback speed set to ${speed}x`);
  }, []);

  const answerAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play audio when agent answers a question
  useEffect(() => {
    if (agentAnswer?.audioUrl && answerAudioRef.current) {
      answerAudioRef.current.src = agentAnswer.audioUrl;
      answerAudioRef.current.play().catch(() => {});
    }
  }, [agentAnswer]);

  // Voice/Utterance handler
  const handleUtterance = useCallback(
    async (utterance: string) => {
      setStatusMessage(`Processing query: "${utterance}"...`);
      try {
        // 1. Send to /api/intent for fast rule-based matching
        const intentRes = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            utterance,
            currentStepId: currentStep?.id,
          }),
        });

        if (intentRes.ok) {
          const { intent, target } = await intentRes.json();

          if (intent === "next") {
            handleNext();
            setStatusMessage("Navigated to next step");
            return;
          }
          if (intent === "go_back") {
            handlePrevious();
            setStatusMessage("Navigated to previous step");
            return;
          }
          if (intent === "repeat") {
            if (currentStep) {
              setStatusMessage(`Repeating: ${currentStep.text}`);
            }
            return;
          }
          if (intent === "slower") {
            handleSpeedChange(Math.max(0.75, playbackSpeed - 0.25));
            return;
          }
          if (intent === "faster") {
            handleSpeedChange(Math.min(2.0, playbackSpeed + 0.25));
            return;
          }
          if (intent === "overview") {
            if (currentStep && tour) {
              const overviewIdx = tour.steps.findIndex(
                (s) => s.diagramId === currentStep.diagramId && s.nodeId === undefined
              );
              if (overviewIdx !== -1) {
                setCurrentStepIndex(overviewIdx);
                setStatusMessage("Navigated to diagram overview");
                return;
              }
            }
          }
          if (intent === "drill_down" && tour) {
            if (target) {
              const allNodeLabels: string[] = [];
              const labelToStepIdx = new Map<string, number>();

              tour.diagrams.forEach((d) => {
                d.nodes.forEach((n) => {
                  allNodeLabels.push(n.label);
                  const stepIdx = tour.steps.findIndex(
                    (s) => s.diagramId === d.id && s.nodeId === n.id
                  );
                  if (stepIdx !== -1) {
                    labelToStepIdx.set(n.label, stepIdx);
                  }
                });
              });

              const fuzzy = fuzzyMatchNodeName(target, allNodeLabels);
              if (fuzzy.ambiguous && fuzzy.candidates.length >= 2) {
                setStatusMessage(`Did you mean ${fuzzy.candidates[0]} or ${fuzzy.candidates[1]}?`);
                return;
              }

              if (fuzzy.matchedLabel && labelToStepIdx.has(fuzzy.matchedLabel)) {
                const idx = labelToStepIdx.get(fuzzy.matchedLabel)!;
                setCurrentStepIndex(idx);
                setStatusMessage(`Drilled down into ${fuzzy.matchedLabel}`);
                return;
              }
            } else {
              handleDrillDown();
              return;
            }
          }
        }

        // 2. Fallback to /api/ask for grounded Q&A
        const askRes = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoId: repoSlug,
            question: utterance,
            currentStepId: currentStep?.id,
            diagrams: tour?.diagrams,
          }),
        });

        if (askRes.ok) {
          const answer: AskResponse = await askRes.json();
          setAgentAnswer(answer);
          setHighlightedNodeIds(answer.referencedNodeIds || []);
          setStatusMessage(answer.text);

          // If spoken audio is returned for the answer, play it aloud
          if (answer.audioUrl) {
            try {
              const ansAudio = new Audio(answer.audioUrl);
              ansAudio.play().catch(() => {});
            } catch {
              // Non-blocking
            }
          }
        }
      } catch (err) {
        setStatusMessage("Error processing query. Try again.");
      }
    },
    [
      currentStep,
      tour,
      playbackSpeed,
      repoSlug,
      handleNext,
      handlePrevious,
      handleDrillDown,
      handleSpeedChange,
    ]
  );

  if (isLoading || !tour || !currentStep) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div
          role="status"
          aria-live="polite"
          className="inline-block p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-300"
        >
          <span className="text-xl block mb-2">🎧</span>
          <p>Loading Audiodidact Tour for {repoSlug}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Repo Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-1">
            <Link
              href="/"
              className="hover:text-cyan-400 underline focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded transition-colors"
            >
              Repositories
            </Link>{" "}
            / <span className="text-cyan-300 font-mono">{repoSlug}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Repository Tour: <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">{repoSlug}</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            ← Change Repository
          </Link>
        </div>
      </div>

      {/* Screen reader status announcements */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Hidden audio element for Q&A spoken response */}
      <audio
        ref={answerAudioRef}
        className="sr-only"
        aria-label="Spoken Q&A agent response"
      />

      {/* Agent Answer Notification Box (when a question is asked) */}
      {agentAnswer && (
        <aside
          aria-label="Agent Answer to Question"
          className={`mb-6 p-4 rounded-xl border shadow-lg transition-all ${
            agentAnswer.grounded
              ? "bg-violet-950/70 border-cyan-500/80 text-cyan-100 ring-1 ring-cyan-500/30 shadow-violet-950/50"
              : "bg-amber-950/70 border-amber-600 text-amber-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {agentAnswer.grounded ? "✓ Grounded Diagram Answer" : "⚠️ Honest Fallback"}
                </span>
                <span className="text-xs opacity-75">
                  ({agentAnswer.grounded ? "Found in diagram" : "Not present in diagram"})
                </span>
              </div>
              <p className="text-sm sm:text-base font-medium">
                {agentAnswer.text}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAgentAnswer(null);
                setHighlightedNodeIds([]);
              }}
              aria-label="Dismiss answer"
              className="text-xs px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-white focus:outline-none focus:ring-2 focus:ring-white"
            >
              ✕ Dismiss
            </button>
          </div>
        </aside>
      )}

      {/* Main Tour Grid: Left (Player, Transcript, Voice) | Right (Sticky System Outline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-start">
        {/* Left Column (7 cols): Studio Player, Live Transcript, & Voice Assistant */}
        <div className="lg:col-span-7 space-y-5">
          <Player
            tourId={tour.repoId}
            steps={tour.steps}
            currentStepIndex={currentStepIndex}
            diagrams={tour.diagrams}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSelectStepIndex={handleSelectStepIndex}
            onDrillDown={handleDrillDown}
            onSpeedChange={handleSpeedChange}
          />

          <Transcript
            currentStep={currentStep}
            stepNumber={currentStepIndex + 1}
            totalSteps={tour.steps.length}
            isPlaying={isPlaying}
          />

          <VoiceButton onUtterance={handleUtterance} />
        </div>

        {/* Right Column (5 cols): Modern Interactive System Outline */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <Outline
            diagrams={tour.diagrams}
            activeDiagramId={currentStep.diagramId}
            activeNodeId={currentStep.nodeId}
            highlightedNodeIds={highlightedNodeIds}
            onSelectNode={handleSelectNode}
          />
        </div>
      </div>

      {/* Full-width Bottom Section: Good First Issues in Modern Grid */}
      <div className="mt-8">
        <IssueList
          issues={issues}
          activeNodeId={currentStep.nodeId}
        />
      </div>
    </div>
  );
}
