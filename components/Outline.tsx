"use client";

import React, { useState, useMemo } from "react";
import { DiagramGraph, GraphNode } from "@/lib/schema";

interface OutlineProps {
  diagrams: DiagramGraph[];
  activeDiagramId?: string;
  activeNodeId?: string;
  highlightedNodeIds?: string[];
  onSelectNode: (diagramId: string, nodeId?: string) => void;
}

export default function Outline({
  diagrams,
  activeDiagramId,
  activeNodeId,
  highlightedNodeIds = [],
  onSelectNode,
}: OutlineProps) {
  const [filterText, setFilterText] = useState("");
  const [selectedDiagramTab, setSelectedDiagramTab] = useState<string>("all");
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});

  const toggleExpandColumns = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedColumns((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const filteredDiagrams = useMemo(() => {
    return diagrams.filter((d) => {
      if (selectedDiagramTab !== "all" && d.id !== selectedDiagramTab) return false;
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchNode = d.nodes.some(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.kind.toLowerCase().includes(q) ||
          (n.description && n.description.toLowerCase().includes(q))
      );
      return matchTitle || matchNode;
    });
  }, [diagrams, selectedDiagramTab, filterText]);

  return (
    <nav
      aria-label="Repository Diagram Structure and Component Outline"
      className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col"
    >
      {/* Outline Header & Search */}
      <div className="border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>System Outline</span>
              <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {diagrams.reduce((acc, d) => acc + d.nodes.length, 0)} Nodes
              </span>
            </h2>
          </div>
        </div>

        {/* Diagram Switcher Tabs */}
        {diagrams.length > 1 && (
          <div className="flex items-center space-x-1 mb-2.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedDiagramTab("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedDiagramTab === "all"
                  ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-sm shadow-violet-900/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({diagrams.length})
            </button>
            {diagrams.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDiagramTab(d.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                  selectedDiagramTab === d.id
                    ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-sm shadow-violet-900/30"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{d.type === "er" ? "📊" : "🏗️"}</span>
                <span className="truncate max-w-[140px]">{d.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter components or tables..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-500/40"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText("")}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Tree Items Container */}
      <div
        role="tree"
        aria-label="Diagrams and components hierarchy"
        className="space-y-3.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1"
      >
        {filteredDiagrams.map((diagram) => {
          const isDiagramActive = activeDiagramId === diagram.id;

          // Map edges for fast relation lookup
          const edgesByFrom = new Map<string, string[]>();
          const edgesByTo = new Map<string, string[]>();
          diagram.edges.forEach((edge) => {
            const outList = edgesByFrom.get(edge.from) || [];
            outList.push(edge.to + (edge.label ? ` (${edge.label})` : ""));
            edgesByFrom.set(edge.from, outList);

            const inList = edgesByTo.get(edge.to) || [];
            inList.push(edge.from + (edge.label ? ` (${edge.label})` : ""));
            edgesByTo.set(edge.to, inList);
          });

          const nodeMap = new Map<string, GraphNode>(diagram.nodes.map((n) => [n.id, n]));

          return (
            <div
              key={diagram.id}
              role="treeitem"
              aria-selected={isDiagramActive && !activeNodeId}
              className={`rounded-xl border transition-all ${
                isDiagramActive
                  ? "border-violet-500/70 bg-slate-950/70 shadow-lg shadow-violet-950/30 ring-1 ring-violet-500/20"
                  : "border-slate-800/80 bg-slate-950/30"
              }`}
            >
              {/* Diagram Header */}
              <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-800/60">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-sm">{diagram.type === "er" ? "📊" : "🏗️"}</span>
                  <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate">
                    {diagram.title}
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                    {diagram.type}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectNode(diagram.id, undefined)}
                  aria-label={`Jump to overview for ${diagram.title}`}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isDiagramActive && !activeNodeId
                      ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-medium shadow-sm shadow-violet-900/30"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Overview
                </button>
              </div>

              {/* Groups & Nodes */}
              <div className="p-2.5 space-y-3" role="group">
                {diagram.groups.map((group) => {
                  let groupNodes = diagram.nodes.filter((n) => n.groupId === group.id);
                  if (filterText.trim()) {
                    const q = filterText.toLowerCase();
                    groupNodes = groupNodes.filter(
                      (n) =>
                        n.label.toLowerCase().includes(q) ||
                        n.kind.toLowerCase().includes(q) ||
                        (n.description && n.description.toLowerCase().includes(q))
                    );
                  }
                  if (groupNodes.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" />
                        <span>{group.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({group.layer})</span>
                      </div>

                      <div className="grid gap-1.5 pl-2.5 border-l border-slate-800/80" role="group">
                        {groupNodes.map((node) => {
                          const isNodeActive = isDiagramActive && activeNodeId === node.id;
                          const isReferenced = highlightedNodeIds.includes(node.id);
                          const isColsExpanded = !!expandedColumns[node.id];
                          const columns = node.details?.columns || [];

                          return (
                            <div
                              key={node.id}
                              role="treeitem"
                              aria-selected={isNodeActive}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onSelectNode(diagram.id, node.id);
                                }
                              }}
                              onClick={() => onSelectNode(diagram.id, node.id)}
                              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                                isNodeActive
                                  ? "bg-violet-950/70 border-cyan-500/80 text-white shadow-md shadow-violet-950/50 ring-1 ring-cyan-500/30"
                                  : isReferenced
                                  ? "bg-amber-950/40 border-amber-600/80 text-amber-200"
                                  : "bg-slate-900/60 hover:bg-slate-800/70 border-slate-800/80 text-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <span className="font-semibold text-xs truncate">
                                    {node.label}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                    {node.kind}
                                  </span>
                                </div>

                                {isNodeActive && (
                                  <span className="text-[10px] bg-cyan-400 text-slate-950 font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm shadow-cyan-400/40">
                                    Active
                                  </span>
                                )}
                              </div>

                              {node.description && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                  {node.description}
                                </p>
                              )}

                              {/* Modern Compact Schema Columns Display */}
                              {columns.length > 0 && (
                                <div className="mt-2 pt-1.5 border-t border-slate-800/60 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Attributes ({columns.length}):
                                    </span>
                                    {columns.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={(e) => toggleExpandColumns(node.id, e)}
                                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium focus:outline-none"
                                      >
                                        {isColsExpanded ? "Hide extra fields ▲" : `+${columns.length - 3} more ▼`}
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-1">
                                    {(isColsExpanded ? columns : columns.slice(0, 3)).map((col, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px]"
                                      >
                                        <span>{col.name}</span>
                                        {col.key && (
                                          <span
                                            className={`text-[8px] px-1 rounded font-bold ${
                                              col.key === "PK"
                                                ? "bg-amber-900 text-amber-200"
                                                : "bg-purple-900 text-purple-200"
                                            }`}
                                          >
                                            {col.key}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
