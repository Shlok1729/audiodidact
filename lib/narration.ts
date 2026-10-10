import {
  DiagramGraph,
  Group,
  GraphNode,
  Layer,
  Tour,
  TourStep,
  VoiceKey,
} from "./schema";

/**
 * Maps a layer to one of the 4 designated ElevenLabs voice keys:
 * - frontend -> frontend
 * - backend, infra -> backend
 * - data -> data
 * - everything else -> narrator
 */
export function layerToVoiceKey(layer: Layer): VoiceKey {
  switch (layer) {
    case "frontend":
      return "frontend";
    case "backend":
    case "infra":
      return "backend";
    case "data":
      return "data";
    default:
      return "narrator";
  }
}

/**
 * Plans a deterministic Tour from one or more DiagramGraphs per Section 8.2.
 */
export function planTour(repoId: string, diagrams: DiagramGraph[]): Tour {
  const steps: TourStep[] = [];

  for (const diagram of diagrams) {
    const nodeMap = new Map<string, GraphNode>(
      diagram.nodes.map((node) => [node.id, node])
    );
    const groupMap = new Map<string, Group>(
      diagram.groups.map((grp) => [grp.id, grp])
    );

    // 1. Diagram-level overview step
    const layerNames = diagram.groups.map((g) => g.label);
    const layersFormatted =
      layerNames.length === 0
        ? "unspecified layers"
        : layerNames.length === 1
        ? layerNames[0]
        : `${layerNames.slice(0, -1).join(", ")} and ${layerNames[layerNames.length - 1]}`;

    const overviewText = `${diagram.title}. ${diagram.summary} It has ${diagram.nodes.length} components in ${diagram.groups.length} layers: ${layersFormatted}. Say 'drill down' followed by a component name to hear more.`;

    const nodeStepIds = diagram.nodes.map(
      (n) => `step-${diagram.id}-${n.id}`
    );

    const overviewStepId = `step-${diagram.id}-overview`;
    steps.push({
      id: overviewStepId,
      diagramId: diagram.id,
      nodeId: undefined,
      layer: "other",
      voiceKey: "narrator",
      text: overviewText,
      children: nodeStepIds,
    });

    // 2. Node steps
    for (const node of diagram.nodes) {
      const stepId = `step-${diagram.id}-${node.id}`;
      const group = node.groupId ? groupMap.get(node.groupId) : undefined;
      const groupLabel = group ? group.label : "general system";
      const layer: Layer = group ? group.layer : "other";
      const voiceKey = layerToVoiceKey(layer);

      // Connected nodes
      const outboundLabels: string[] = [];
      const inboundLabels: string[] = [];
      const childStepIds: string[] = [];

      for (const edge of diagram.edges) {
        if (edge.from === node.id) {
          const target = nodeMap.get(edge.to);
          if (target) {
            outboundLabels.push(target.label);
            childStepIds.push(`step-${diagram.id}-${target.id}`);
          }
        }
        if (edge.to === node.id) {
          const source = nodeMap.get(edge.from);
          if (source) {
            inboundLabels.push(source.label);
          }
        }
        if (edge.direction === "bidirectional") {
          if (edge.to === node.id) {
            const source = nodeMap.get(edge.from);
            if (source && !childStepIds.includes(`step-${diagram.id}-${source.id}`)) {
              childStepIds.push(`step-${diagram.id}-${source.id}`);
            }
          }
        }
      }

      let script = "";
      if (node.details?.columns && node.details.columns.length > 0) {
        const cols = node.details.columns;
        const keyCols = cols.slice(0, 4).map((c) => c.name);
        const colSummary =
          cols.length > 4
            ? `Key fields include ${keyCols.join(", ")}, plus ${cols.length - 4} additional attributes.`
            : `Fields include ${keyCols.join(", ")}.`;
        const relations =
          outboundLabels.length > 0
            ? ` It relates to ${outboundLabels.join(", ")}.`
            : "";
        script = `${node.label}, a ${node.kind} in the ${groupLabel}. ${colSummary}${relations}`;
      } else {
        const outboundPart =
          outboundLabels.length > 0
            ? `connects to ${outboundLabels.join(", ")}`
            : "has no outbound connections";
        const inboundPart =
          inboundLabels.length > 0
            ? `receives from ${inboundLabels.join(", ")}`
            : "receives no direct inputs";
        script = `${node.label}, a ${node.kind} in the ${groupLabel}. It ${outboundPart} and ${inboundPart}.`;
      }

      if (node.description) {
        script += ` ${node.description}`;
      }

      steps.push({
        id: stepId,
        diagramId: diagram.id,
        nodeId: node.id,
        layer,
        voiceKey,
        text: script,
        children: childStepIds,
      });
    }
  }

  return {
    repoId,
    diagrams,
    steps,
  };
}
