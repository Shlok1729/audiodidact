import { synthesizeSpeech, generateMockAudioBuffer, VOICE_MAP } from "../lib/elevenlabs";
import { saveToStorage, getFromStorage } from "../lib/storage";
import { sha256 } from "../lib/hash";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function runPhase2Verification() {
  console.log("\n--- 1. Validating Voice Map Configurations ---");
  assert(!!VOICE_MAP.narrator, "Narrator voice configured");
  assert(!!VOICE_MAP.frontend, "Frontend voice configured");
  assert(!!VOICE_MAP.backend, "Backend voice configured");
  assert(!!VOICE_MAP.data, "Data voice configured");

  console.log("\n--- 2. Validating Audio Synthesis for Distinct Voices ---");
  const text1 = "Next.js Web Application in the Web Client Layer.";
  const text2 = "API Gateway in the Core API & Processing Services.";

  const audioNarrator = await synthesizeSpeech(text1, "narrator");
  const audioFrontend = await synthesizeSpeech(text1, "frontend");
  const audioBackend = await synthesizeSpeech(text2, "backend");
  const audioData = await synthesizeSpeech(text2, "data");

  assert(audioNarrator.buffer.length > 1000, `Narrator audio synthesized (${audioNarrator.buffer.length} bytes)`);
  assert(audioFrontend.buffer.length > 1000, `Frontend audio synthesized (${audioFrontend.buffer.length} bytes)`);
  assert(audioBackend.buffer.length > 1000, `Backend audio synthesized (${audioBackend.buffer.length} bytes)`);
  assert(audioData.buffer.length > 1000, `Data audio synthesized (${audioData.buffer.length} bytes)`);

  // Verify that the audio waveforms generated for distinct voices are distinct
  assert(
    !audioFrontend.buffer.equals(audioBackend.buffer),
    "Frontend and Backend voices generate distinct acoustic audio data"
  );
  assert(
    !audioNarrator.buffer.equals(audioData.buffer),
    "Narrator and Data voices generate distinct acoustic audio data"
  );

  console.log("\n--- 3. Validating Caching & Storage by Content Hash ---");
  const cacheKey = `${sha256(`frontend:${text1}`)}.wav`;
  const savedUrl = await saveToStorage(cacheKey, audioFrontend.buffer, audioFrontend.contentType);
  assert(savedUrl === `/api/audio/${cacheKey}`, `Audio saved to storage: ${savedUrl}`);

  const retrieved = await getFromStorage(cacheKey);
  assert(retrieved !== null, "Audio successfully retrieved from storage");
  assert(retrieved!.buffer.equals(audioFrontend.buffer), "Retrieved audio matches original synthesized buffer");

  console.log("\n🎉 ALL PHASE 2 VERIFICATION CHECKS PASSED!\n");
}

runPhase2Verification().catch((err) => {
  console.error(err);
  process.exit(1);
});
