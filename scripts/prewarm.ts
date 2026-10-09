import { parseRepoSlug, discoverRepo } from "../lib/github";
import { getVisionLLM } from "../lib/llm";
import { planTour } from "../lib/narration";
import { synthesizeSpeech } from "../lib/elevenlabs";
import { saveToStorage, getFromStorage } from "../lib/storage";
import { sha256 } from "../lib/hash";
import { DiagramGraph } from "../lib/schema";
import architectureFixture from "../fixtures/architecture.json";
import erFixture from "../fixtures/er.json";

async function main() {
  const target = process.argv[2] || "audiodidact/demo";
  const { repoId } = parseRepoSlug(target);
  console.log(`\n🎧 Audiodidact Prewarm: Generating tour cache for "${repoId}"...`);

  // 1. Discover
  console.log("1. Discovering diagrams and good first issues...");
  const discovery = await discoverRepo(repoId);
  console.log(`   Found ${discovery.diagrams.length} diagrams, ${discovery.goodFirstIssues.length} issues.`);

  // 2. Analyze
  console.log("2. Analyzing diagrams...");
  const vision = getVisionLLM();
  const diagrams: DiagramGraph[] = [];

  for (const d of discovery.diagrams) {
    const hash = sha256(d.path);
    const cacheKey = `${hash}.json`;
    const cached = await getFromStorage(cacheKey, "graphs");

    if (cached) {
      console.log(`   [CACHED] ${d.path}`);
      diagrams.push(JSON.parse(cached.buffer.toString("utf-8")));
    } else {
      console.log(`   [ANALYZING] ${d.path}`);
      const graph = await vision.extractGraph(Buffer.from(""), "image/png", d.path);
      graph.id = hash;
      graph.sourcePath = d.path;
      await saveToStorage(cacheKey, Buffer.from(JSON.stringify(graph, null, 2)), "application/json", "graphs");
      diagrams.push(graph);
    }
  }

  if (diagrams.length === 0) {
    diagrams.push(architectureFixture as DiagramGraph);
    diagrams.push(erFixture as DiagramGraph);
  }

  // 3. Plan Tour
  console.log("3. Planning narration tour...");
  const tour = planTour(repoId, diagrams);
  console.log(`   Planned ${tour.steps.length} tour steps.`);

  // 4. Synthesize Audio
  console.log("4. Pre-warming audio assets...");
  const isMock = process.env.USE_MOCKS === "true" || !process.env.ELEVENLABS_API_KEY;
  const ext = isMock ? "wav" : "mp3";

  for (let i = 0; i < tour.steps.length; i++) {
    const step = tour.steps[i];
    const audioKey = `${sha256(`${step.voiceKey}:${step.text}`)}.${ext}`;
    const cachedAudio = await getFromStorage(audioKey);

    if (cachedAudio) {
      console.log(`   [CACHED AUDIO] Step ${i + 1}/${tour.steps.length} (${step.voiceKey})`);
    } else {
      console.log(`   [SYNTHESIZING] Step ${i + 1}/${tour.steps.length} (${step.voiceKey})`);
      const { buffer, contentType } = await synthesizeSpeech(step.text, step.voiceKey);
      await saveToStorage(audioKey, buffer, contentType);
    }
  }

  console.log(`\n✓ Tour for "${repoId}" pre-warmed successfully!\n`);
}

main().catch((err) => {
  console.error("Prewarm failed:", err);
  process.exit(1);
});
