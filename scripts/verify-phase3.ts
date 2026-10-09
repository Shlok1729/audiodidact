import fs from "fs";
import path from "path";
import { GemmaVision, GEMMA_SYSTEM_PROMPT } from "../lib/gemma";
import { DiagramGraphSchema } from "../lib/schema";
import { sha256 } from "../lib/hash";
import { saveToStorage, getFromStorage } from "../lib/storage";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runPhase3Verification() {
  console.log("\n--- 1. Validating Gemma System Prompt per Section 8.1 ---");
  assert(GEMMA_SYSTEM_PROMPT.includes("accessibility-focused diagram reader"), "Includes accessibility role");
  assert(GEMMA_SYSTEM_PROMPT.includes("Output ONLY valid JSON"), "Includes strict JSON rule");
  assert(GEMMA_SYSTEM_PROMPT.includes("Never invent components"), "Includes anti-hallucination rule");
  assert(GEMMA_SYSTEM_PROMPT.includes("summary"), "Includes plain language summary rule");

  console.log("\n--- 2. Validating Real Architecture Diagram Extraction ---");
  const archSvgPath = path.join(process.cwd(), "fixtures", "architecture.svg");
  const archBuffer = fs.readFileSync(archSvgPath);
  const vision = new GemmaVision();

  const archGraph = await vision.extractGraph(archBuffer, "image/svg+xml", "fixtures/architecture.svg");
  const parsedArch = DiagramGraphSchema.safeParse(archGraph);
  assert(parsedArch.success, "Architecture diagram output strictly conforms to DiagramGraphSchema");
  assert(archGraph.type === "architecture", "Correctly identified as architecture diagram");
  assert(archGraph.nodes.length >= 3, `Extracted ${archGraph.nodes.length} nodes from architecture diagram`);
  assert(archGraph.confidence >= 0.7, `Model reported confidence: ${archGraph.confidence}`);
  console.log(`   Architecture summary: "${archGraph.summary.slice(0, 80)}..."`);
  console.log(`   Confidence: ${archGraph.confidence}, Warnings: [${archGraph.warnings.join(", ")}]`);

  console.log("\n--- 3. Validating Real ER Diagram Extraction ---");
  const erSvgPath = path.join(process.cwd(), "fixtures", "schema_er.svg");
  const erBuffer = fs.readFileSync(erSvgPath);

  const erGraph = await vision.extractGraph(erBuffer, "image/svg+xml", "fixtures/schema_er.svg");
  const parsedER = DiagramGraphSchema.safeParse(erGraph);
  assert(parsedER.success, "ER diagram output strictly conforms to DiagramGraphSchema");
  assert(erGraph.type === "er", "Correctly identified as ER diagram");
  assert(erGraph.nodes.length >= 2, `Extracted ${erGraph.nodes.length} table nodes from ER diagram`);
  assert(erGraph.confidence >= 0.7, `Model reported confidence: ${erGraph.confidence}`);
  console.log(`   ER summary: "${erGraph.summary.slice(0, 80)}..."`);
  console.log(`   Confidence: ${erGraph.confidence}, Warnings: [${erGraph.warnings.join(", ")}]`);

  console.log("\n--- 4. Validating Content-Hashed Graph Caching ---");
  const hash = sha256(archBuffer);
  const cacheKey = `${hash}.json`;
  await saveToStorage(cacheKey, Buffer.from(JSON.stringify(archGraph)), "application/json", "graphs");

  const cached = await getFromStorage(cacheKey, "graphs");
  assert(cached !== null, "Successfully cached and retrieved graph by image content hash");
  const cachedJson = JSON.parse(cached!.buffer.toString());
  assert(cachedJson.id === archGraph.id, "Cached graph ID matches extracted graph ID");

  console.log("\n🎉 ALL PHASE 3 VERIFICATION CHECKS PASSED!\n");
}

runPhase3Verification().catch((err) => {
  console.error(err);
  process.exit(1);
});
