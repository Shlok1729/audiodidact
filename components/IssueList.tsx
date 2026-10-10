"use client";

import React, { useState } from "react";
import { GoodFirstIssue } from "@/lib/schema";

interface IssueListProps {
  issues: GoodFirstIssue[];
  activeNodeId?: string;
}

export default function IssueList({ issues, activeNodeId }: IssueListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!issues || issues.length === 0) return null;

  return (
    <section
      aria-label="Good First Issues for Contribution"
      className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-base">🎯</span>
          <div>
            <h3 className="text-sm font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-wide uppercase flex items-center space-x-2">
              <span>Good First Issues</span>
              <span className="text-[11px] font-normal text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                {issues.length} available
              </span>
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded bg-slate-800/60"
        >
          {isExpanded ? "Collapse ▲" : "Expand ▼"}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {issues.map((issue) => {
            const isRelated = activeNodeId && issue.relatedNodeId === activeNodeId;

            return (
              <div
                key={issue.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isRelated
                    ? "bg-violet-950/60 border-cyan-500/80 text-white ring-1 ring-cyan-500/30 shadow-lg shadow-violet-950/50"
                    : "bg-slate-950/70 hover:bg-slate-950 border-slate-800/80 text-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-900/60">
                      #{issue.number}
                    </span>
                    {isRelated && (
                      <span className="text-[9px] bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm shadow-violet-900/40">
                        Active Node Match
                      </span>
                    )}
                  </div>

                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-xs sm:text-sm text-slate-100 hover:text-cyan-300 hover:underline line-clamp-2 block mb-2"
                  >
                    {issue.title}
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.slice(0, 2).map((label, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center space-x-1"
                  >
                    <span>View</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
