import { AgentAnswer, DiagramGraph, GraphNode } from "./schema";
import { QAAgent, GraphContext } from "./llm";
import { fuzzyMatchNodeName } from "./intent";
import architectureFixture from "../fixtures/architecture.json";
import erFixture from "../fixtures/er.json";

export const GRADIENT_AGENT_INSTRUCTIONS = `You answer questions about one open-source repository's architecture for a blind developer who is listening to your answer.

- Answer ONLY from the knowledge base (extracted diagram graphs and repo docs).
- If the answer is not in the knowledge base, say exactly: "That isn't shown in the diagrams I have for this repository." and optionally suggest what is available.
- Be concise: 1-3 short sentences, suitable for speech. No markdown, no bullet symbols, no references to visual position.
- Name components exactly as they are labeled in the diagrams.
- When useful, end by offering one next step ("Want me to drill into X?").`;

/**
 * GradientQA connects to DigitalOcean Gradient AI Agent with grounded knowledge base,
 * falling back to deterministic graph grounding when credentials are unset or USE_MOCKS is enabled.
 */
export class GradientQA implements QAAgent {
  private accessKey: string;
  private agentEndpoint: string;
  private kbId: string;

  constructor() {
    this.accessKey = process.env.GRADIENT_ACCESS_KEY || "";
    this.agentEndpoint = process.env.GRADIENT_AGENT_ENDPOINT || "";
    this.kbId = process.env.GRADIENT_KB_ID || "";
  }

  async ask(repoId: string, question: string, context: GraphContext): Promise<AgentAnswer> {
    const isMock = process.env.USE_MOCKS === "true" || !this.accessKey || !this.agentEndpoint;

    if (isMock) {
      return this.askGroundedGraph(question, context);
    }

    try {
      // Call DigitalOcean Gradient AI Agent Endpoint
      const response = await fetch(this.agentEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessKey}`,
        },
        body: JSON.stringify({
          prompt: question,
          system_instruction: GRADIENT_AGENT_INSTRUCTIONS,
          context: {
            repoId,
            kbId: this.kbId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gradient Agent API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawText: string = data.answer || data.message || data.text || "";

      const notShownPattern = /not (shown|found|available|present) in the diagrams/i;
      const isGrounded = !notShownPattern.test(rawText);

      // Extract referenced node IDs by matching against known diagram nodes
      const diagrams = context.diagrams || [architectureFixture as DiagramGraph, erFixture as DiagramGraph];
      const referencedNodeIds: string[] = [];

      for (const d of diagrams) {
        for (const n of d.nodes) {
          if (rawText.toLowerCase().includes(n.label.toLowerCase()) || rawText.toLowerCase().includes(n.id)) {
            referencedNodeIds.push(n.id);
          }
        }
      }

      return {
        text: rawText.trim(),
        grounded: isGrounded,
        referencedNodeIds: Array.from(new Set(referencedNodeIds)),
      };
    } catch {
      // Graceful fallback to graph grounding
      return this.askGroundedGraph(question, context);
    }
  }

  /**
   * Grounds Q&A directly in the extracted DiagramGraph data structures.
   */
  private askGroundedGraph(question: string, context: GraphContext): AgentAnswer {
    const diagrams: DiagramGraph[] =
      context.diagrams && context.diagrams.length > 0
        ? context.diagrams
        : [architectureFixture as DiagramGraph, erFixture as DiagramGraph];

    const allNodes: GraphNode[] = [];
    const nodeToDiagram = new Map<string, DiagramGraph>();

    for (const d of diagrams) {
      for (const node of d.nodes) {
        allNodes.push(node);
        nodeToDiagram.set(node.id, d);
      }
    }

    const nodeLabels = allNodes.map((n) => n.label);
    const fuzzy = fuzzyMatchNodeName(question, nodeLabels);

    if (fuzzy.ambiguous && fuzzy.candidates.length >= 2) {
      return {
        text: `Did you mean ${fuzzy.candidates[0]} or ${fuzzy.candidates[1]}?`,
        grounded: true,
        referencedNodeIds: [],
      };
    }

    if (fuzzy.matchedLabel) {
      const node = allNodes.find((n) => n.label === fuzzy.matchedLabel)!;
      const diagram = nodeToDiagram.get(node.id)!;

      // Find connections
      const outbound = diagram.edges
        .filter((e) => e.from === node.id)
        .map((e) => allNodes.find((n) => n.id === e.to)?.label)
        .filter(Boolean) as string[];

      const inbound = diagram.edges
        .filter((e) => e.to === node.id || (e.direction === "bidirectional" && e.from === node.id))
        .map((e) => allNodes.find((n) => n.id === e.from)?.label)
        .filter(Boolean) as string[];

      const lowerQ = question.toLowerCase();
      let answerText = "";

      // Check if question asks specifically about connections / dependencies
      if (
        lowerQ.includes("connect") ||
        lowerQ.includes("talk to") ||
        lowerQ.includes("depend") ||
        lowerQ.includes("call")
      ) {
        const outPart =
          outbound.length > 0
            ? `It connects to ${outbound.join(", ")}.`
            : "It has no outbound connections.";
        const inPart =
          inbound.length > 0
            ? ` It receives from ${inbound.join(", ")}.`
            : "";
        answerText = `${node.label} is a ${node.kind}. ${outPart}${inPart}`;
      } else if (node.details?.columns && node.details.columns.length > 0) {
        const cols = node.details.columns.map((c) => c.name).join(", ");
        answerText = `${node.label} is a database table with columns: ${cols}. It relates to ${outbound.join(", ") || "other entities"}.`;
      } else {
        const desc = node.description ? ` ${node.description}` : "";
        const nextStep = outbound.length > 0 ? ` Want me to drill into ${outbound[0]}?` : "";
        answerText = `${node.label} is a ${node.kind} in the system.${desc}${nextStep}`;
      }

      return {
        text: answerText.trim(),
        grounded: true,
        referencedNodeIds: [node.id],
      };
    }

    // Honest fallback per Section 8.3
    return {
      text: "That isn't shown in the diagrams I have for this repository.",
      grounded: false,
      referencedNodeIds: [],
    };
  }
}
