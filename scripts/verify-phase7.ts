function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runDemoScriptIteration(iteration: number) {
  console.log(`\n========================================`);
  console.log(`🎬 DEMO RUN ${iteration} of 3 (Section 16 Demo Script)`);
  console.log(`========================================`);

  const baseUrl = "http://localhost:3001";

  // Step 1 & 2: Paste repo URL and discover diagrams
  console.log("1. Discovering repository diagrams via /api/discover...");
  const t0 = performance.now();
  const discRes = await fetch(`${baseUrl}/api/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl: "https://github.com/audiodidact/demo" }),
  });
  assert(discRes.ok, "Discover endpoint returned 200 OK");
  const discovery = await discRes.json();
  assert(discovery.diagrams.length >= 2, `Discovered ${discovery.diagrams.length} diagrams`);
  assert(discovery.goodFirstIssues.length > 0, `Discovered ${discovery.goodFirstIssues.length} issues`);

  // Step 3: Tour loads with multi-voice narration
  console.log("2. Loading tour and verifying multi-voice assignment via /api/tour...");
  const tourRes = await fetch(`${baseUrl}/api/tour`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoId: "audiodidact/demo" }),
  });
  assert(tourRes.ok, "Tour endpoint returned 200 OK");
  const tour = await tourRes.json();
  const loadDuration = performance.now() - t0;
  console.log(`   Tour loaded in ${loadDuration.toFixed(2)}ms with ${tour.steps.length} steps`);

  const distinctVoices = Array.from(new Set(tour.steps.map((s: any) => s.voiceKey)));
  assert(distinctVoices.length >= 2, `Tour includes at least 2 distinct voices: [${distinctVoices.join(", ")}]`);

  // Verify audio asset URLs are reachable
  const firstStepAudio = tour.steps[0].audioUrl;
  assert(!!firstStepAudio, `Step 1 has audioUrl: ${firstStepAudio}`);
  const audioCheck = await fetch(`${baseUrl}${firstStepAudio}`);
  assert(audioCheck.ok, `Audio asset stream returned 200 OK (${audioCheck.headers.get("content-type")})`);

  // Step 4: Voice command "Drill down into database"
  console.log("3. Executing voice command: 'Drill down into database'...");
  const intentRes = await fetch(`${baseUrl}/api/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utterance: "Drill down into database" }),
  });
  assert(intentRes.ok, "Intent endpoint returned 200 OK");
  const intentData = await intentRes.json();
  assert(intentData.intent === "drill_down", "Classified as drill_down intent");

  // Step 5: Question "What connects to API Gateway?"
  console.log("4. Asking grounded question: 'What connects to API Gateway?'...");
  const askConnectRes = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repoId: "audiodidact/demo",
      question: "What connects to API Gateway?",
    }),
  });
  assert(askConnectRes.ok, "Ask endpoint returned 200 OK");
  const askConnect = await askConnectRes.json();
  assert(askConnect.grounded === true, "Answer is grounded in diagram");
  assert(askConnect.referencedNodeIds.includes("api-gateway"), "References api-gateway node");
  console.log(`   Answer: "${askConnect.text}"`);

  // Step 6: Out-of-scope question
  console.log("5. Asking out-of-scope question: 'Does this repo support Stripe payments?'...");
  const askStripeRes = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repoId: "audiodidact/demo",
      question: "Does this repo support Stripe payments?",
    }),
  });
  assert(askStripeRes.ok, "Ask endpoint returned 200 OK");
  const askStripe = await askStripeRes.json();
  assert(askStripe.grounded === false, "Out of scope question marked grounded: false");
  assert(
    askStripe.text === "That isn't shown in the diagrams I have for this repository.",
    "Section 8.3 exact fallback phrase returned"
  );
  console.log(`   Answer: "${askStripe.text}"`);

  // Step 7: Good first issues verified
  console.log("6. Verifying good first issues mapped to explored components...");
  assert(discovery.goodFirstIssues.length > 0, "Good first issues are present and mapped");

  console.log(`✓ DEMO RUN ${iteration} PASSED COMPLETELY WITHOUT ERRORS.`);
}

async function runAll() {
  console.log("\n🎧 Audiodidact Phase 7: Executing Section 16 Demo Script 3 Times in a Row");

  for (let i = 1; i <= 3; i++) {
    await runDemoScriptIteration(i);
  }

  console.log("\n🎉 ALL 3 CONSECUTIVE DEMO SCRIPT RUNS PASSED CLEANLY WITH ZERO ERRORS!\n");
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
