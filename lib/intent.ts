import { IntentType } from "./schema";

export interface IntentMatchResult {
  intent: IntentType;
  target?: string;
}

/**
 * Fast rule-based intent matcher per Section 8.4 and Section 14.
 */
export function matchIntent(utterance: string): IntentMatchResult {
  const lower = utterance.toLowerCase().trim();

  if (lower.includes("overview") || lower.includes("summary")) {
    return { intent: "overview" };
  }

  const drillMatch = lower.match(/(?:drill down into|drill down|explore)\s+(.+)/);
  if (drillMatch && drillMatch[1]) {
    return { intent: "drill_down", target: drillMatch[1].trim() };
  }
  if (lower.includes("drill down")) {
    return { intent: "drill_down" };
  }

  const connectMatch = lower.match(/(?:what connects to|connects to|connected to)\s+(.+)/);
  if (connectMatch && connectMatch[1]) {
    return { intent: "connects_to", target: connectMatch[1].trim() };
  }

  if (lower.includes("go back") || lower.includes("previous")) {
    return { intent: "go_back" };
  }

  if (lower.includes("next diagram") || lower.includes("next")) {
    return { intent: "next" };
  }

  if (lower.includes("repeat that") || lower.includes("repeat")) {
    return { intent: "repeat" };
  }

  if (lower.includes("slower")) {
    return { intent: "slower" };
  }

  if (lower.includes("faster")) {
    return { intent: "faster" };
  }

  if (lower.includes("good first issue") || lower.includes("first issues") || lower.includes("issues")) {
    return { intent: "first_issues" };
  }

  return { intent: "question" };
}

/**
 * Fuzzy matches a candidate name against available nodes per Section 14.
 */
export function matchNodeName(query: string, nodeLabels: string[]): string | null {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetClean = clean(query);

  for (const label of nodeLabels) {
    const lClean = clean(label);
    if (lClean === targetClean || lClean.includes(targetClean) || targetClean.includes(lClean)) {
      return label;
    }
  }
  return null;
}
