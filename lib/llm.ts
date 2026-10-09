import { DiagramGraph, AgentAnswer, Tour, TourStep } from "./schema";
import architectureFixture from "../fixtures/architecture.json";
import erFixture from "../fixtures/er.json";

export interface GraphContext {
  diagrams?: DiagramGraph[];
  currentStep?: TourStep;
  tour?: Tour;
}

export interface VisionLLM {
  extractGraph(image: Buffer, mime: string, hint?: string): Promise<DiagramGraph>;
}

export interface QAAgent {
  ask(repoId: string, question: string, context: GraphContext): Promise<AgentAnswer>;
}

/**
 * MockVision returns canned DiagramGraph fixtures without external model calls.
 */
export class MockVision implements VisionLLM {
  async extractGraph(_image: Buffer, _mime: string, hint?: string): Promise<DiagramGraph> {
    const lowerHint = (hint || "").toLowerCase();
    if (lowerHint.includes("er") || lowerHint.includes("schema") || lowerHint.includes("database")) {
      return erFixture as DiagramGraph;
    }
    return architectureFixture as DiagramGraph;
  }
}

/**
 * MockQA answers questions grounded strictly in the available diagram graphs.
 * If a component is recognized, it provides a grounded response.
 * Otherwise, it follows rule 8.3: "That isn't shown in the diagrams I have for this repository."
 */
export class MockQA implements QAAgent {
  async ask(_repoId: string, question: string, context: GraphContext): Promise<AgentAnswer> {
    const lowerQ = question.toLowerCase();
    const diagrams = context.diagrams && context.diagrams.length > 0 
      ? context.diagrams 
      : [architectureFixture as DiagramGraph, erFixture as DiagramGraph];

    // Find all nodes across diagrams
    const matchedNodes: { id: string; label: string; kind: string; desc?: string }[] = [];
    for (const d of diagrams) {
      for (const node of d.nodes) {
        if (
          lowerQ.includes(node.label.toLowerCase()) ||
          lowerQ.includes(node.id.toLowerCase()) ||
          (node.kind && lowerQ.includes(node.kind.toLowerCase()))
        ) {
          matchedNodes.push({
            id: node.id,
            label: node.label,
            kind: node.kind,
            desc: node.description,
          });
        }
      }
    }

    if (matchedNodes.length > 0) {
      const primary = matchedNodes[0];
      const desc = primary.desc ? ` ${primary.desc}` : "";
      return {
        text: `${primary.label} is a ${primary.kind} identified in the architecture diagram.${desc}`,
        grounded: true,
        referencedNodeIds: matchedNodes.map((n) => n.id),
      };
    }

    // Default honest fallback per Section 8.3
    return {
      text: "That isn't shown in the diagrams I have for this repository.",
      grounded: false,
      referencedNodeIds: [],
    };
  }
}

import { GemmaVision } from "./gemma";

/**
 * Factory functions to retrieve LLM providers or mocks.
 */
export function getVisionLLM(): VisionLLM {
  if (process.env.USE_MOCKS !== "true" && process.env.GEMMA_API_KEY) {
    return new GemmaVision();
  }
  return new MockVision();
}

export function getQAAgent(): QAAgent {
  // During Phase 0/1 (or when USE_MOCKS is set or true), use MockQA
  return new MockQA();
}
