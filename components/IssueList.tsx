"use client";

import React from "react";
import { GoodFirstIssue } from "@/lib/schema";

interface IssueListProps {
  issues: GoodFirstIssue[];
  activeNodeId?: string;
}

export default function IssueList({ issues, activeNodeId }: IssueListProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <section
      aria-label="Good First Issues for Contribution"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Good First Issues
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Beginner-friendly contribution opportunities connected to the architecture components.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {issues.map((issue) => {
          const isRelated = activeNodeId && issue.relatedNodeId === activeNodeId;

          return (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border transition-all ${
                isRelated
                  ? "bg-blue-950/50 border-blue-600/80 text-white"
                  : "bg-slate-950/60 border-slate-800 text-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm text-blue-400 hover:text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                >
                  #{issue.number}: {issue.title}
                </a>

                {isRelated && (
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                    Active Component Match
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {issue.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {label}
                  </span>
                ))}
                {issue.relatedNodeId && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    Component: {issue.relatedNodeId}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
