import {
  parseRepoSlug,
  extractReadmeImages,
  isValidDiagramCandidate,
  discoverRepo,
} from "../lib/github";
import { DiscoverResponseSchema, TourSchema } from "../lib/schema";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runPhase4Verification() {
  console.log("\n--- 1. Validating Repo Slug Parsing ---");
  const slug1 = parseRepoSlug("https://github.com/facebook/react");
  assert(slug1.owner === "facebook" && slug1.repo === "react", "Parsed full GitHub URL");

  const slug2 = parseRepoSlug("vercel/next.js");
  assert(slug2.owner === "vercel" && slug2.repo === "next.js", "Parsed short slug");

  const slug3 = parseRepoSlug("https://github.com/audiodidact/demo.git");
  assert(slug3.repo === "demo", "Stripped .git suffix cleanly");

  console.log("\n--- 2. Validating README Image Extraction ---");
  const sampleReadme = `
# Project Demo
Welcome! Here is our architecture:
![Architecture Overview](docs/architecture.png)
And our database model:
<img src="docs/schema_er.svg" alt="ER Schema" width="600" />
Don't include badges:
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Logo](assets/logo.png)
`;
  const extracted = extractReadmeImages(sampleReadme);
  assert(extracted.includes("docs/architecture.png"), "Extracted markdown image");
  assert(extracted.includes("docs/schema_er.svg"), "Extracted HTML img tag");
  assert(!extracted.some((img) => img.includes("shields.io")), "Filtered out badge");
  assert(!extracted.some((img) => img.includes("logo")), "Filtered out logo");

  console.log("\n--- 3. Validating Image Candidate Filter Heuristics ---");
  assert(isValidDiagramCandidate("docs/system_architecture.png") === true, "Valid diagram PNG");
  assert(isValidDiagramCandidate("assets/schema.svg") === true, "Valid schema SVG");
  assert(isValidDiagramCandidate("icons/favicon.ico") === false, "Filtered favicon");
  assert(isValidDiagramCandidate("img/sponsor_logo.png") === false, "Filtered sponsor logo");

  console.log("\n--- 4. Validating Discover Repo with Octokit / Mock ---");
  const discovery = await discoverRepo("https://github.com/audiodidact/demo");
  const parsedDisc = DiscoverResponseSchema.safeParse(discovery);
  assert(parsedDisc.success, "Discovery output strictly conforms to DiscoverResponseSchema");
  assert(discovery.diagrams.length >= 2, `Discovered ${discovery.diagrams.length} diagrams`);
  assert(discovery.goodFirstIssues.length > 0, `Fetched ${discovery.goodFirstIssues.length} good first issues`);

  console.log(`   Repo: ${discovery.repoId}`);
  console.log(`   Sample diagram: ${discovery.diagrams[0].path} (from ${discovery.diagrams[0].referencedFrom})`);
  console.log(`   Sample issue: #${discovery.goodFirstIssues[0].number} - "${discovery.goodFirstIssues[0].title}"`);

  console.log("\n🎉 ALL PHASE 4 VERIFICATION CHECKS PASSED!\n");
}

runPhase4Verification().catch((err) => {
  console.error(err);
  process.exit(1);
});
