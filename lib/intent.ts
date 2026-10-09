import { IntentType } from "./schema";

export interface IntentMatchResult {
  intent: IntentType;
  target?: string;
  ambiguous?: boolean;
  ambiguousCandidates?: string[];
}

/**
 * Fast rule-based intent matcher per Section 8.4 and Section 14.
 */
export function matchIntent(utterance: string): IntentMatchResult {
  const lower = utterance.toLowerCase().trim();

  // 1. Overview intent
  if (
    lower.includes("overview") ||
    lower.includes("summary") ||
    lower.includes("tell me about the repo") ||
    lower.includes("what is this project")
  ) {
    return { intent: "overview" };
  }

  // 2. Drill down intent
  const drillRegex = /(?:drill down into|drill down|drill into|inspect|dive into|explore)\s+(.+)/i;
  const drillMatch = lower.match(drillRegex);
  if (drillMatch && drillMatch[1]) {
    return { intent: "drill_down", target: cleanEntityTarget(drillMatch[1]) };
  }
  if (lower.startsWith("drill down") || lower.startsWith("explore")) {
    return { intent: "drill_down" };
  }

  // 3. Connects to intent
  const connectRegex = /(?:what connects to|connects to|connected to|depends on|what talks to|what calls)\s+(.+)/i;
  const connectMatch = lower.match(connectRegex);
  if (connectMatch && connectMatch[1]) {
    return { intent: "connects_to", target: cleanEntityTarget(connectMatch[1]) };
  }

  // 4. Navigation controls
  if (lower.includes("go back") || lower.includes("previous step") || lower === "previous" || lower === "back") {
    return { intent: "go_back" };
  }
  if (lower.includes("next diagram") || lower.includes("next step") || lower === "next") {
    return { intent: "next" };
  }
  if (lower.includes("repeat that") || lower.includes("repeat") || lower.includes("say that again")) {
    return { intent: "repeat" };
  }

  // 5. Speed controls
  if (lower.includes("slower") || lower.includes("slow down")) {
    return { intent: "slower" };
  }
  if (lower.includes("faster") || lower.includes("speed up")) {
    return { intent: "faster" };
  }

  // 6. Good first issues
  if (
    lower.includes("good first issue") ||
    lower.includes("first issues") ||
    lower.includes("beginner issue") ||
    lower.includes("contribute") ||
    lower.includes("issues")
  ) {
    return { intent: "first_issues" };
  }

  // 7. General question intent (routed to Q&A agent)
  return { intent: "question", target: utterance.trim() };
}

/**
 * Cleans user query target string (strips question marks, trailing punctuation, articles)
 */
function cleanEntityTarget(str: string): string {
  return str
    .replace(/[?!.,;:]/g, "")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalizes words by stripping non-alphanumeric chars and basic plural endings
 */
function normalizeWord(w: string): string {
  let cleaned = w.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.endsWith("ies") && cleaned.length > 4) {
    cleaned = cleaned.slice(0, -3) + "y"; // e.g. repositories -> repository
  } else if (cleaned.endsWith("es") && cleaned.length > 4) {
    cleaned = cleaned.slice(0, -2); // e.g. databases -> database
  } else if (cleaned.endsWith("s") && cleaned.length > 3) {
    cleaned = cleaned.slice(0, -1); // e.g. queues -> queue
  }
  return cleaned;
}

export interface FuzzyNodeMatchResult {
  matchedLabel: string | null;
  ambiguous: boolean;
  candidates: string[];
}

/**
 * Fuzzy matches a query against available node labels per Section 14:
 * - Case-insensitive
 * - Strips punctuation
 * - Handles plurals
 * - Small edit-distance threshold
 * - Detects ambiguity ("Did you mean A or B?")
 */
export function fuzzyMatchNodeName(query: string, nodeLabels: string[]): FuzzyNodeMatchResult {
  if (!query || nodeLabels.length === 0) {
    return { matchedLabel: null, ambiguous: false, candidates: [] };
  }

  const queryNorm = normalizeWord(query);
  const scores: { label: string; score: number }[] = [];

  for (const label of nodeLabels) {
    const labelNorm = normalizeWord(label);

    // Exact match after normalization
    if (labelNorm === queryNorm) {
      return { matchedLabel: label, ambiguous: false, candidates: [label] };
    }

    // Substring containment
    if (labelNorm.includes(queryNorm) || queryNorm.includes(labelNorm)) {
      scores.push({ label, score: 0.9 });
      continue;
    }

    // Check individual token overlap
    const queryTokens = query.toLowerCase().split(/[\s_-]+/).map(normalizeWord).filter(Boolean);
    const labelTokens = label.toLowerCase().split(/[\s_-]+/).map(normalizeWord).filter(Boolean);

    let tokenMatches = 0;
    for (const qTok of queryTokens) {
      for (const lTok of labelTokens) {
        if (qTok === lTok || levenshteinDistance(qTok, lTok) <= 1) {
          tokenMatches++;
          break;
        }
      }
    }

    if (tokenMatches > 0) {
      const tokenScore = tokenMatches / Math.max(queryTokens.length, labelTokens.length);
      scores.push({ label, score: 0.5 + 0.4 * tokenScore });
      continue;
    }

    // Edit distance threshold
    const dist = levenshteinDistance(queryNorm, labelNorm);
    const maxLen = Math.max(queryNorm.length, labelNorm.length);
    if (dist <= 2 && maxLen >= 4) {
      scores.push({ label, score: 1 - dist / maxLen });
    }
  }

  if (scores.length === 0) {
    return { matchedLabel: null, ambiguous: false, candidates: [] };
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  // Check ambiguity: if top two candidates have very close scores (within 0.05)
  if (scores.length > 1 && Math.abs(scores[0].score - scores[1].score) < 0.05 && scores[0].score < 0.95) {
    return {
      matchedLabel: null,
      ambiguous: true,
      candidates: [scores[0].label, scores[1].label],
    };
  }

  return {
    matchedLabel: scores[0].label,
    ambiguous: false,
    candidates: [scores[0].label],
  };
}

/**
 * Backward compatibility helper
 */
export function matchNodeName(query: string, nodeLabels: string[]): string | null {
  const result = fuzzyMatchNodeName(query, nodeLabels);
  return result.matchedLabel;
}
