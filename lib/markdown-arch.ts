import { DiagramGraph, GraphNode, GraphEdge, Group, DiagramGraphSchema } from "./schema";
import { sha256 } from "./hash";

/**
 * Extracts architecture graphs from Markdown files containing:
 * 1. Mermaid graphs (`graph TD`, `flowchart LR`, etc.)
 * 2. ASCII/Unicode box-and-arrow pipeline diagrams
 * 3. Structured module specification sections (e.g. "## Module Specifications", "### Planner", etc.)
 */
export function parseArchitectureFromMarkdown(
  markdown: string,
  filePath: string
): DiagramGraph | null {
  // 1. Try parsing Mermaid diagram first if present
  const mermaidMatch = markdown.match(/```(?:mermaid)?\s*[\r\n]+((?:graph|flowchart)[\s\S]*?)```/i);
  if (mermaidMatch) {
    const parsed = parseMermaid(mermaidMatch[1], filePath);
    if (parsed) return parsed;
  }

  // 2. Try parsing ASCII pipeline diagram or module specifications
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "System Architecture Pipeline";

  // Check for pipeline ascii box diagram (e.g. ┌──┐, |  |, etc.)
  const rawBoxNames: { label: string; subtitle?: string }[] = [];
  const parts = markdown.split(/[┌\+][─┬\-]+[┐\+]/);
  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i++) {
      const boxContent = parts[i].split(/[└\+][─┴\-]+[┘\+]/)[0];
      const lines = boxContent
        .split("\n")
        .map((l) => l.replace(/^[│|\s]+/, "").replace(/[│|\s]+$/, "").trim())
        .filter((l) => l.length > 0);
      if (lines.length > 0) {
        const label = lines[0];
        const subtitle = lines.slice(1).join(" ").replace(/[│|]/g, "").trim();
        rawBoxNames.push({ label, subtitle: subtitle || undefined });
      }
    }
  }

  // Also parse structured module headings: ### 2.1 Planner (`core/planner/planner.py`)
  const moduleHeadings = Array.from(
    markdown.matchAll(/###?\s+(?:\d+\.\d+\s+)?([A-Za-z0-9_\s&/\-]+?)(?:\s*\(([`a-zA-Z0-9_./\-]+)\))?$/gm)
  );

  const parsedNodes: { label: string; subtitle?: string; fileRef?: string; description?: string }[] = [];

  if (rawBoxNames.length >= 3) {
    for (const item of rawBoxNames) {
      // Find matching heading for description and file reference
      const heading = moduleHeadings.find((h) =>
        h[1].toLowerCase().includes(item.label.toLowerCase()) || item.label.toLowerCase().includes(h[1].toLowerCase())
      );
      parsedNodes.push({
        label: item.label,
        subtitle: item.subtitle,
        fileRef: heading ? heading[2]?.replace(/`/g, "") : undefined,
      });
    }
  } else if (moduleHeadings.length >= 3) {
    for (const h of moduleHeadings) {
      parsedNodes.push({
        label: h[1].trim(),
        fileRef: h[2]?.replace(/`/g, ""),
      });
    }
  }

  if (parsedNodes.length === 0) {
    return null;
  }

  const groups: Group[] = [
    { id: "frontend-group", label: "Client & Ingress", layer: "frontend" },
    { id: "backend-group", label: "Core Pipeline", layer: "backend" },
    { id: "data-group", label: "Persistence Tier", layer: "data" },
  ];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < parsedNodes.length; i++) {
    const item = parsedNodes[i];
    const lower = item.label.toLowerCase();
    const id = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    let groupId = "backend-group";
    let kind = "service";

    if (lower.includes("input") || lower.includes("intent") || lower.includes("client") || lower.includes("ui") || lower.includes("dashboard")) {
      groupId = "frontend-group";
      kind = "client";
    } else if (lower.includes("storage") || lower.includes("database") || lower.includes("db") || lower.includes("registry")) {
      groupId = "data-group";
      kind = "database";
    }

    // Extract description from markdown following the heading if available
    let description = item.fileRef ? `Source code implementation in ${item.fileRef}.` : item.subtitle;
    const descRegex = new RegExp(`###?\\s+(?:\\d+\\.\\d+\\s+)?${item.label}[\\s\\S]*?\\n\\n([\\s\\S]*?)(?=\\n###?|$)`, "i");
    const descMatch = markdown.match(descRegex);
    if (descMatch && descMatch[1]) {
      const summaryLine = descMatch[1].replace(/[-*`#]/g, "").trim().split("\n")[0];
      if (summaryLine) {
        description = summaryLine;
      }
    }

    nodes.push({
      id,
      label: item.label,
      kind,
      groupId,
      description,
    });

    // Build sequential pipeline edges
    if (i > 0) {
      const prevId = nodes[i - 1].id;
      edges.push({
        id: `edge-${prevId}-${id}`,
        from: prevId,
        to: id,
        label: "flows to",
        direction: "forward",
      });
    }
  }

  // Extract high-level summary
  const summaryMatch = markdown.match(/^([A-Z][^.\n]+(?:\.|\n))/m);
  const summary = summaryMatch ? summaryMatch[1].trim() : `Architectural pipeline for ${title}`;

  const graph: DiagramGraph = {
    id: sha256(`${filePath}:${title}`),
    sourcePath: filePath,
    type: "architecture",
    title,
    summary,
    confidence: 0.95,
    warnings: [],
    groups,
    nodes,
    edges,
  };

  return DiagramGraphSchema.parse(graph);
}

/**
 * Extracts ER / Schema models from markdown files (e.g. docs/data-schema.md)
 */
export function parseSchemaFromMarkdown(
  markdown: string,
  filePath: string
): DiagramGraph | null {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "Canonical Data Schemas";

  // Look for schema entity sections: ## 1. `Opportunity` ... ```json ... ```
  const entityMatches = Array.from(
    markdown.matchAll(/##\s+(?:\d+\.\s+)?(?:`([^`]+)`|([A-Za-z0-9_]+))(?:\s*\(([^)]+)\))?[\s\S]*?```json\s*([\s\S]*?)```/g)
  );

  if (entityMatches.length === 0) {
    return null;
  }

  const groups: Group[] = [
    { id: "entities-group", label: "Domain Models", layer: "data" },
  ];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const m of entityMatches) {
    const rawName = m[1] || m[2];
    const subtitle = m[3] || "";
    const jsonStr = m[4];
    const id = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    let columns: { name: string; type?: string; key?: "PK" | "FK" }[] = [];
    try {
      const sample = JSON.parse(jsonStr);
      columns = Object.keys(sample).map((k) => ({
        name: k,
        type: typeof sample[k] === "number" ? "float/int" : typeof sample[k] === "boolean" ? "boolean" : Array.isArray(sample[k]) ? "array" : typeof sample[k] === "object" ? "json" : "string",
        key: k === "id" ? ("PK" as const) : undefined,
      }));
    } catch {
      columns = [{ name: "id", type: "uuid", key: "PK" as const }, { name: "created_at", type: "timestamp" }];
    }

    nodes.push({
      id,
      label: subtitle ? `${rawName} (${subtitle})` : rawName,
      kind: "table",
      groupId: "entities-group",
      description: `Canonical schema with ${columns.length} attributes.`,
      details: {
        columns,
      },
    });
  }

  // Add relational edge if schemas reference each other
  if (nodes.length >= 2) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `rel-${nodes[i].id}-${nodes[i + 1].id}`,
        from: nodes[i].id,
        to: nodes[i + 1].id,
        label: "references",
        direction: "forward",
      });
    }
  }

  const graph: DiagramGraph = {
    id: sha256(`${filePath}:${title}`),
    sourcePath: filePath,
    type: "er",
    title,
    summary: `Entity-relationship models extracted from ${filePath}.`,
    confidence: 0.95,
    warnings: [],
    groups,
    nodes,
    edges,
  };

  return DiagramGraphSchema.parse(graph);
}

/**
 * Parses basic Mermaid flowchart into DiagramGraph
 */
function parseMermaid(mermaid: string, filePath: string): DiagramGraph | null {
  const nodeMap = new Map<string, string>();
  const edges: GraphEdge[] = [];

  // Match A[Label] or A --> B or A -->|label| B
  const nodeRegex = /([A-Za-z0-9_-]+)\[([^\]]+)\]/g;
  let match;
  while ((match = nodeRegex.exec(mermaid)) !== null) {
    nodeMap.set(match[1], match[2]);
  }

  const edgeRegex = /([A-Za-z0-9_-]+)\s*(?:-->|->)\s*(?:\|([^|]+)\|)?\s*([A-Za-z0-9_-]+)/g;
  while ((match = edgeRegex.exec(mermaid)) !== null) {
    const src = match[1];
    const lbl = match[2] || "connects to";
    const tgt = match[3];
    edges.push({
      id: `edge-${src}-${tgt}`,
      from: src,
      to: tgt,
      label: lbl,
      direction: "forward",
    });
    if (!nodeMap.has(src)) nodeMap.set(src, src);
    if (!nodeMap.has(tgt)) nodeMap.set(tgt, tgt);
  }

  if (nodeMap.size === 0) return null;

  const groups: Group[] = [
    { id: "core-group", label: "Core Flow", layer: "backend" },
  ];

  const nodes: GraphNode[] = [];
  for (const [id, label] of Array.from(nodeMap.entries())) {
    const lower = label.toLowerCase();
    let kind = "service";

    if (lower.includes("ui") || lower.includes("client") || lower.includes("user")) {
      kind = "client";
    } else if (lower.includes("db") || lower.includes("data") || lower.includes("store")) {
      kind = "database";
    }

    nodes.push({
      id,
      label,
      kind,
      groupId: "core-group",
      description: `${label} component defined in diagram.`,
    });
  }

  const graph: DiagramGraph = {
    id: sha256(mermaid),
    sourcePath: filePath,
    type: "architecture",
    title: "Repository Flowchart Diagram",
    summary: `System flowchart containing ${nodes.length} nodes and ${edges.length} connections.`,
    confidence: 0.9,
    warnings: [],
    groups,
    nodes,
    edges,
  };

  return DiagramGraphSchema.parse(graph);
}
