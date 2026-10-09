"use client";

import React, { useState } from "react";
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
  // Track expanded groups/diagrams
  const [expandedDiagrams, setExpandedDiagrams] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    diagrams.forEach((d) => {
      initial[d.id] = true;
    });
    return initial;
  });

  const toggleDiagram = (diagramId: string) => {
    setExpandedDiagrams((prev) => ({
      ...prev,
      [diagramId]: !prev[diagramId],
    }));
  };

  return (
    <nav
      aria-label="Repository Diagram Structure and Component Outline"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            System Outline Tree
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Always-available text model. Navigate by keyboard or click to inspect any component.
          </p>
        </div>
      </div>

      <div role="tree" aria-label="Diagrams and components hierarchy" className="space-y-4">
        {diagrams.map((diagram) => {
          const isDiagramActive = activeDiagramId === diagram.id;
          const isExpanded = !!expandedDiagrams[diagram.id];

          // Map edges for easy lookup of inbound and outbound relations
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

          // Node map for fast label resolution
          const nodeMap = new Map<string, GraphNode>(diagram.nodes.map((n) => [n.id, n]));

          return (
            <div
              key={diagram.id}
              role="treeitem"
              aria-expanded={isExpanded}
              aria-selected={isDiagramActive && !activeNodeId}
              className={`rounded-lg border transition-all ${
                isDiagramActive
                  ? "border-blue-700/80 bg-slate-950/70"
                  : "border-slate-800 bg-slate-950/30"
              }`}
            >
              {/* Diagram Tree Item Header */}
              <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-800/60">
                <button
                  type="button"
                  onClick={() => toggleDiagram(diagram.id)}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} diagram ${diagram.title}`}
                  className="flex items-center space-x-2 text-left font-semibold text-sm text-slate-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1"
                >
                  <span className="text-xs text-slate-400">{isExpanded ? "▼" : "▶"}</span>
                  <span>{diagram.title}</span>
                  <span className="text-xs font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                    {diagram.type}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectNode(diagram.id, undefined)}
                  aria-label={`Jump to ${diagram.title} overview step`}
                  className={`text-xs px-2.5 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    isDiagramActive && !activeNodeId
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Jump to Overview
                </button>
              </div>

              {/* Diagram Children: Groups and Nodes */}
              {isExpanded && (
                <div className="p-3 space-y-4" role="group">
                  {diagram.groups.map((group) => {
                    const groupNodes = diagram.nodes.filter((n) => n.groupId === group.id);
                    if (groupNodes.length === 0) return null;

                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                          <span>{group.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({group.layer})</span>
                        </div>

                        <div className="grid gap-2 pl-3 border-l-2 border-slate-800" role="group">
                          {groupNodes.map((node) => {
                            const isNodeActive = isDiagramActive && activeNodeId === node.id;
                            const isReferenced = highlightedNodeIds.includes(node.id);

                            // Resolve human readable edge labels
                            const outEdges = (edgesByFrom.get(node.id) || []).map((targetStr) => {
                              const [tgtId, labelPart] = targetStr.split(" (");
                              const targetNode = nodeMap.get(tgtId);
                              return targetNode
                                ? targetNode.label + (labelPart ? ` (${labelPart}` : "")
                                : targetStr;
                            });

                            const inEdges = (edgesByTo.get(node.id) || []).map((srcStr) => {
                              const [srcId, labelPart] = srcStr.split(" (");
                              const srcNode = nodeMap.get(srcId);
                              return srcNode
                                ? srcNode.label + (labelPart ? ` (${labelPart}` : "")
                                : srcStr;
                            });

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
                                className={`p-3 rounded-lg border text-left cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                  isNodeActive
                                    ? "bg-blue-950/60 border-blue-500 text-white shadow-md shadow-blue-950/50"
                                    : isReferenced
                                    ? "bg-amber-950/40 border-amber-600/80 text-amber-200"
                                    : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm">
                                      {node.label}
                                    </span>
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                      {node.kind}
                                    </span>
                                  </div>

                                  {isNodeActive && (
                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold">
                                      Active Step
                                    </span>
                                  )}
                                  {isReferenced && !isNodeActive && (
                                    <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded font-bold">
                                      Q&A Mention
                                    </span>
                                  )}
                                </div>

                                {node.description && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    {node.description}
                                  </p>
                                )}

                                {/* ER Columns if available */}
                                {node.details?.columns && node.details.columns.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-800/60 text-xs">
                                    <span className="text-[11px] text-slate-400 block mb-1 font-semibold">
                                      Columns ({node.details.columns.length}):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {node.details.columns.map((col, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]"
                                        >
                                          <span>{col.name}</span>
                                          {col.key && (
                                            <span
                                              className={`text-[9px] px-1 rounded font-bold ${
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

                                {/* Connected edges */}
                                {(outEdges.length > 0 || inEdges.length > 0) && (
                                  <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] space-y-1">
                                    {outEdges.length > 0 && (
                                      <div className="text-slate-400">
                                        <strong className="text-slate-300 font-medium">Connects to:</strong>{" "}
                                        {outEdges.join(", ")}
                                      </div>
                                    )}
                                    {inEdges.length > 0 && (
                                      <div className="text-slate-400">
                                        <strong className="text-slate-300 font-medium">Receives from:</strong>{" "}
                                        {inEdges.join(", ")}
                                      </div>
                                    )}
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
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
