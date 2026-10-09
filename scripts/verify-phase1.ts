import { DiagramGraphSchema, TourSchema } from "../lib/schema";
import { planTour, layerToVoiceKey } from "../lib/narration";
import { matchIntent, matchNodeName } from "../lib/intent";
import { MockQA } from "../lib/llm";
import architectureFixture from "../fixtures/architecture.json";
import erFixture from "../fixtures/er.json";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runVerification() {
  console.log("\n--- 1. Validating DiagramGraph Fixtures with Zod ---");
  const parsedArch = DiagramGraphSchema.safeParse(architectureFixture);
  assert(parsedArch.success, "architecture.json conforms strictly to DiagramGraphSchema");

  const parsedER = DiagramGraphSchema.safeParse(erFixture);
  assert(parsedER.success, "er.json conforms strictly to DiagramGraphSchema");

  console.log("\n--- 2. Validating Narration Planner & Tour Generation ---");
  const tour = planTour("audiodidact/demo", [architectureFixture as any, erFixture as any]);
  const parsedTour = TourSchema.safeParse(tour);
  assert(parsedTour.success, "Generated tour conforms strictly to TourSchema");
  assert(tour.steps.length > 5, `Tour generated ${tour.steps.length} steps`);
  assert(tour.steps[0].voiceKey === "narrator", "Overview step uses narrator voice");

  // Check voice mapping
  assert(layerToVoiceKey("frontend") === "frontend", "frontend layer maps to frontend voice");
  assert(layerToVoiceKey("backend") === "backend", "backend layer maps to backend voice");
  assert(layerToVoiceKey("infra") === "backend", "infra layer maps to backend voice");
  assert(layerToVoiceKey("data") === "data", "data layer maps to data voice");
  assert(layerToVoiceKey("other") === "narrator", "other layer maps to narrator voice");

  console.log("\n--- 3. Validating Rule-Based Intent Matching ---");
  assert(matchIntent("Give me the overview").intent === "overview", "overview intent matched");
  assert(matchIntent("drill down into database").intent === "drill_down", "drill_down intent matched");
  assert(matchIntent("what connects to api-gateway").intent === "connects_to", "connects_to intent matched");
  assert(matchIntent("go back").intent === "go_back", "go_back intent matched");
  assert(matchIntent("next diagram").intent === "next", "next intent matched");
  assert(matchIntent("repeat that").intent === "repeat", "repeat intent matched");
  assert(matchIntent("speak slower").intent === "slower", "slower intent matched");
  assert(matchIntent("speak faster").intent === "faster", "faster intent matched");
  assert(matchIntent("show me good first issues").intent === "first_issues", "first_issues intent matched");
  assert(matchIntent("what is the weather today?").intent === "question", "arbitrary question intent matched");

  console.log("\n--- 4. Validating Node Name Fuzzy Matching ---");
  const nodeLabels = ["API Gateway", "PostgreSQL Database", "Redis Task Queue"];
  assert(matchNodeName("api gateway", nodeLabels) === "API Gateway", "Fuzzy matched API Gateway");
  assert(matchNodeName("redis", nodeLabels) === "Redis Task Queue", "Fuzzy matched Redis");

  console.log("\n--- 5. Validating MockQA Grounding and Honest Fallback ---");
  const qa = new MockQA();
  const answerGrounded = await qa.ask("audiodidact/demo", "Tell me about the api gateway", {
    diagrams: [architectureFixture as any],
  });
  assert(answerGrounded.grounded === true, "Recognized node produces grounded: true");
  assert(answerGrounded.referencedNodeIds.includes("api-gateway"), "Referenced node IDs includes api-gateway");

  const answerUngrounded = await qa.ask("audiodidact/demo", "Does this repo use Kubernetes Helm charts?", {
    diagrams: [architectureFixture as any],
  });
  assert(answerUngrounded.grounded === false, "Unrecognized question produces grounded: false");
  assert(
    answerUngrounded.text === "That isn't shown in the diagrams I have for this repository.",
    "Section 8.3 exact fallback phrase returned for ungrounded question"
  );

  console.log("\n🎉 ALL PHASE 0 & PHASE 1 VERIFICATION CHECKS PASSED!\n");
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
