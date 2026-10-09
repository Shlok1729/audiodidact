import { z } from "zod";

// --- Section 6.1: DiagramGraph ---

export const DiagramTypeSchema = z.enum([
  "architecture",
  "er",
  "sequence",
  "flowchart",
  "wireframe",
  "unknown",
]);
export type DiagramType = z.infer<typeof DiagramTypeSchema>;

export const LayerSchema = z.enum([
  "frontend",
  "backend",
  "data",
  "infra",
  "external",
  "other",
]);
export type Layer = z.infer<typeof LayerSchema>;

export const GroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  layer: LayerSchema,
});
export type Group = z.infer<typeof GroupSchema>;

export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  key: z.enum(["PK", "FK"]).optional(),
});
export type Column = z.infer<typeof ColumnSchema>;

export const GraphNodeDetailsSchema = z
  .object({
    columns: z.array(ColumnSchema).optional(),
  })
  .optional();
export type GraphNodeDetails = z.infer<typeof GraphNodeDetailsSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.string(), // "service" | "database" | "table" | "queue" | "actor" | "client" | ...
  groupId: z.string().optional(),
  description: z.string().optional(),
  details: GraphNodeDetailsSchema,
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  direction: z.enum(["forward", "bidirectional"]),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const DiagramGraphSchema = z.object({
  id: z.string(),
  sourcePath: z.string(),
  type: DiagramTypeSchema,
  title: z.string(),
  summary: z.string(),
  groups: z.array(GroupSchema),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});
export type DiagramGraph = z.infer<typeof DiagramGraphSchema>;

// --- Section 6.2: Tour ---

export const VoiceKeySchema = z.enum([
  "narrator",
  "frontend",
  "backend",
  "data",
]);
export type VoiceKey = z.infer<typeof VoiceKeySchema>;

export const TourStepSchema = z.object({
  id: z.string(),
  diagramId: z.string(),
  nodeId: z.string().optional(),
  layer: LayerSchema,
  voiceKey: VoiceKeySchema,
  text: z.string(),
  audioUrl: z.string().optional(),
  children: z.array(z.string()),
});
export type TourStep = z.infer<typeof TourStepSchema>;

export const TourSchema = z.object({
  repoId: z.string(),
  diagrams: z.array(DiagramGraphSchema),
  steps: z.array(TourStepSchema),
});
export type Tour = z.infer<typeof TourSchema>;

// --- Section 6.3: AgentAnswer ---

export const AgentAnswerSchema = z.object({
  text: z.string(),
  grounded: z.boolean(),
  referencedNodeIds: z.array(z.string()),
});
export type AgentAnswer = z.infer<typeof AgentAnswerSchema>;

// --- Section 7: API Request & Response Schemas ---

export const DiscoverRequestSchema = z.object({
  repoUrl: z.string().min(1),
});
export type DiscoverRequest = z.infer<typeof DiscoverRequestSchema>;

export const DiscoveredDiagramSchema = z.object({
  path: z.string(),
  rawUrl: z.string(),
  referencedFrom: z.string(),
});
export type DiscoveredDiagram = z.infer<typeof DiscoveredDiagramSchema>;

export const GoodFirstIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  html_url: z.string(),
  labels: z.array(z.string()),
  relatedNodeId: z.string().optional(),
});
export type GoodFirstIssue = z.infer<typeof GoodFirstIssueSchema>;

export const DiscoverResponseSchema = z.object({
  repoId: z.string(),
  diagrams: z.array(DiscoveredDiagramSchema),
  goodFirstIssues: z.array(GoodFirstIssueSchema),
});
export type DiscoverResponse = z.infer<typeof DiscoverResponseSchema>;

export const AnalyzeRequestSchema = z.object({
  repoId: z.string(),
  path: z.string(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const TourRequestSchema = z.object({
  repoId: z.string(),
});
export type TourRequest = z.infer<typeof TourRequestSchema>;

export const NarrateRequestSchema = z.object({
  stepId: z.string(),
  text: z.string(),
  voiceKey: VoiceKeySchema,
});
export type NarrateRequest = z.infer<typeof NarrateRequestSchema>;

export const NarrateResponseSchema = z.object({
  audioUrl: z.string(),
});
export type NarrateResponse = z.infer<typeof NarrateResponseSchema>;

export const AskRequestSchema = z.object({
  repoId: z.string(),
  question: z.string(),
  currentStepId: z.string().optional(),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

export const AskResponseSchema = AgentAnswerSchema.extend({
  audioUrl: z.string().optional(),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;

export const IntentTypeSchema = z.enum([
  "overview",
  "drill_down",
  "connects_to",
  "go_back",
  "next",
  "repeat",
  "slower",
  "faster",
  "first_issues",
  "question",
]);
export type IntentType = z.infer<typeof IntentTypeSchema>;

export const IntentRequestSchema = z.object({
  utterance: z.string(),
  currentStepId: z.string().optional(),
  tourSummary: z.string().optional(),
});
export type IntentRequest = z.infer<typeof IntentRequestSchema>;

export const IntentResponseSchema = z.object({
  intent: IntentTypeSchema,
  target: z.string().optional(),
});
export type IntentResponse = z.infer<typeof IntentResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
