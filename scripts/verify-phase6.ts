import fs from "fs";
import path from "path";
import { saveToStorage, getFromStorage, isSpacesConfigured } from "../lib/storage";
import { sha256 } from "../lib/hash";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runPhase6Verification() {
  console.log("\n--- 1. Validating DigitalOcean Spaces & Cache Fallback Engine ---");
  const spacesActive = isSpacesConfigured();
  console.log(`   DigitalOcean Spaces Status: ${spacesActive ? "CONFIGURED (S3 Active)" : "FALLBACK ACTIVE (Local Disk .cache/)"}`);

  const testKey = `test-${Date.now()}.wav`;
  const testBuffer = Buffer.from("RIFF test audio content bytes");

  // Save asset
  const url = await saveToStorage(testKey, testBuffer, "audio/wav", "audio");
  assert(typeof url === "string" && url.length > 0, `Asset saved to storage: ${url}`);

  // Retrieve asset
  const startRead = performance.now();
  const retrieved = await getFromStorage(testKey, "audio");
  const readDuration = performance.now() - startRead;

  assert(retrieved !== null, "Successfully retrieved asset from storage");
  assert(retrieved!.buffer.equals(testBuffer), "Retrieved buffer matches original content");
  assert(readDuration < 15, `Cache hit retrieved in ${readDuration.toFixed(2)}ms (< 15ms target)`);

  console.log("\n--- 2. Validating Diagram Graph Caching ---");
  const graphKey = `graph-${Date.now()}.json`;
  const graphData = Buffer.from(JSON.stringify({ id: "g1", title: "Test Graph" }));

  await saveToStorage(graphKey, graphData, "application/json", "graphs");
  const retrievedGraph = await getFromStorage(graphKey, "graphs");
  assert(retrievedGraph !== null, "Graph retrieved from 'graphs' storage folder");
  assert(JSON.parse(retrievedGraph!.buffer.toString()).title === "Test Graph", "Parsed graph matches stored data");

  console.log("\n--- 3. Validating DigitalOcean App Platform Specification ---");
  const appYamlPath = path.join(process.cwd(), ".do", "app.yaml");
  assert(fs.existsSync(appYamlPath), ".do/app.yaml exists");

  const appYamlContent = fs.readFileSync(appYamlPath, "utf-8");
  assert(appYamlContent.includes("build_command: npm run build"), "Spec defines build command");
  assert(appYamlContent.includes("run_command: npm start"), "Spec defines run command");
  assert(appYamlContent.includes("http_port: 3000"), "Spec defines HTTP port 3000");
  assert(appYamlContent.includes("type: SECRET"), "Spec defines encrypted secrets");
  assert(appYamlContent.includes("SPACES_BUCKET"), "Spec includes Spaces bucket config");

  console.log("\n--- 4. Validating Second Run Near-Instant Cache Hit ---");
  const t0 = performance.now();
  const cachedHit = await getFromStorage(testKey, "audio");
  const hitDuration = performance.now() - t0;
  assert(cachedHit !== null, "Second run retrieved from cache");
  assert(hitDuration < 5, `Second run executed in ${hitDuration.toFixed(2)}ms (near-instant)`);

  console.log("\n🎉 ALL PHASE 6 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!\n");
}

runPhase6Verification().catch((err) => {
  console.error(err);
  process.exit(1);
});
