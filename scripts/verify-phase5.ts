import { matchIntent, fuzzyMatchNodeName } from "../lib/intent";
import { GradientQA } from "../lib/gradient";
import architectureFixture from "../fixtures/architecture.json";
import erFixture from "../fixtures/er.json";
import { DiagramGraph } from "../lib/schema";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runPhase5Verification() {
  console.log("\n--- 1. Validating Voice Intent Routing (Section 14) ---");
  const i1 = matchIntent("Drill down into database");
  assert(i1.intent === "drill_down" && i1.target === "database", "drill down intent & target matched");

  const i2 = matchIntent("What connects to api-gateway?");
  assert(i2.intent === "connects_to" && i2.target === "api-gateway", "connects to intent & target matched");

  const i3 = matchIntent("Give me the overview");
  assert(i3.intent === "overview", "overview intent matched");

  const i4 = matchIntent("Repeat that please");
  assert(i4.intent === "repeat", "repeat intent matched");

  const i5 = matchIntent("Speak slower");
  assert(i5.intent === "slower", "slower intent matched");

  const i6 = matchIntent("Speak faster");
  assert(i6.intent === "faster", "faster intent matched");

  console.log("\n--- 2. Validating Fuzzy Node Matching with Plural & Edit-Distance ---");
  const nodeLabels = [
    "Next.js Web Application",
    "API Gateway",
    "Diagram Analysis Service",
    "Narration Planner Service",
    "Redis Task Queue",
    "PostgreSQL Database",
    "Spaces Object Storage",
    "repositories",
    "diagrams",
    "tour_steps",
  ];

  const m1 = fuzzyMatchNodeName("database", nodeLabels);
  assert(m1.matchedLabel === "PostgreSQL Database", "Fuzzy matched 'database' -> 'PostgreSQL Database'");

  const m2 = fuzzyMatchNodeName("api gateway", nodeLabels);
  assert(m2.matchedLabel === "API Gateway", "Fuzzy matched 'api gateway' -> 'API Gateway'");

  const m3 = fuzzyMatchNodeName("redis", nodeLabels);
  assert(m3.matchedLabel === "Redis Task Queue", "Fuzzy matched 'redis' -> 'Redis Task Queue'");

  const m4 = fuzzyMatchNodeName("databases", nodeLabels); // plural
  assert(m4.matchedLabel === "PostgreSQL Database", "Handled plural 'databases' -> 'PostgreSQL Database'");

  const m5 = fuzzyMatchNodeName("repositorie", nodeLabels); // typo
  assert(m5.matchedLabel === "repositories", "Tolerated typo 'repositorie' -> 'repositories'");

  console.log("\n--- 3. Validating GradientQA Grounded Answers ---");
  const qa = new GradientQA();
  const context = {
    diagrams: [architectureFixture as DiagramGraph, erFixture as DiagramGraph],
  };

  // 3a. "what connects to [node]"
  console.log("   Testing 'What connects to API Gateway?'...");
  const connectAnswer = await qa.ask("audiodidact/demo", "What connects to API Gateway?", context);
  assert(connectAnswer.grounded === true, "Answer is grounded");
  assert(connectAnswer.referencedNodeIds.includes("api-gateway"), "References api-gateway node");
  assert(
    connectAnswer.text.includes("Diagram Analysis Service") || connectAnswer.text.includes("connects to"),
    "Answer accurately details connected services"
  );
  console.log(`   Answer: "${connectAnswer.text}"`);

  // 3b. "drill down into [node]"
  console.log("   Testing 'Drill down into PostgreSQL Database'...");
  const drillAnswer = await qa.ask("audiodidact/demo", "Drill down into PostgreSQL Database", context);
  assert(drillAnswer.grounded === true, "Answer is grounded");
  assert(drillAnswer.referencedNodeIds.includes("primary-db"), "References primary-db node");
  console.log(`   Answer: "${drillAnswer.text}"`);

  // 3c. Out-of-scope question
  console.log("   Testing out-of-scope question 'Does this repo support Stripe payments?'...");
  const outOfScopeAnswer = await qa.ask("audiodidact/demo", "Does this repo support Stripe payments?", context);
  assert(outOfScopeAnswer.grounded === false, "Out of scope question marked grounded: false");
  assert(
    outOfScopeAnswer.text === "That isn't shown in the diagrams I have for this repository.",
    "Returns exact Section 8.3 honest phrase"
  );
  assert(outOfScopeAnswer.referencedNodeIds.length === 0, "No referenced nodes for out of scope question");
  console.log(`   Answer: "${outOfScopeAnswer.text}"`);

  console.log("\n🎉 ALL PHASE 5 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!\n");
}

runPhase5Verification().catch((err) => {
  console.error(err);
  process.exit(1);
});
