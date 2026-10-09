import { VoiceKey } from "./schema";

export const VOICE_MAP: Record<VoiceKey, string> = {
  narrator: process.env.ELEVENLABS_VOICE_NARRATOR || "21m00Tcm4TlvDq8ikWAM", // Rachel
  frontend: process.env.ELEVENLABS_VOICE_FRONTEND || "AZnzlk1XvdvUeBnXmlld", // Domi
  backend: process.env.ELEVENLABS_VOICE_BACKEND || "ErXwobaYiN019PkySvjV",   // Antoni
  data: process.env.ELEVENLABS_VOICE_DATA || "TxGEqnHWrfWFTfGW9XjX",         // Josh
};

/**
 * Generates a valid multi-voice WAV audio buffer for mock mode.
 * Each voiceKey produces a distinctive acoustic pitch and cadence.
 */
export function generateMockAudioBuffer(voiceKey: VoiceKey, text: string): Buffer {
  const sampleRate = 22050;
  // Estimate duration from word count (roughly 150 words per minute = 2.5 words/sec), min 2 sec, max 10 sec
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const durationSec = Math.max(2, Math.min(8, Math.round(wordCount / 2.5)));
  const totalSamples = sampleRate * durationSec;

  // Distinct base frequencies per voice
  const baseFrequencies: Record<VoiceKey, number> = {
    narrator: 220, // A3 (balanced)
    frontend: 330, // E4 (bright / higher)
    backend: 165,  // E3 (grounded / lower)
    data: 120,     // B2 (deep bass)
  };

  const baseFreq = baseFrequencies[voiceKey] || 220;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * blockAlign;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // "fmt " Subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // "data" Subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant synthesized multi-harmonic waveform with speech-like rhythm cadence
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Cadence modulation (simulate syllables at ~4 Hz)
    const cadence = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t);
    // Primary harmonic + overtone
    const sampleVal =
      0.6 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.3 * Math.sin(2 * Math.PI * (baseFreq * 2) * t) +
      0.1 * Math.sin(2 * Math.PI * (baseFreq * 1.5) * t);

    // Apply envelope at start and end to avoid clicks
    const envelope = Math.min(1, Math.min(t * 10, (durationSec - t) * 10));
    const finalVal = Math.floor(sampleVal * cadence * envelope * 12000);

    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, finalVal)), 44 + i * 2);
  }

  return buffer;
}

/**
 * Synthesize speech using ElevenLabs API with local cache fallback or mock generator.
 */
export async function synthesizeSpeech(
  text: string,
  voiceKey: VoiceKey
): Promise<{ buffer: Buffer; contentType: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const useMocks = process.env.USE_MOCKS === "true" || !apiKey;

  if (useMocks) {
    const buffer = generateMockAudioBuffer(voiceKey, text);
    return { buffer, contentType: "audio/wav" };
  }

  const voiceId = VOICE_MAP[voiceKey] || VOICE_MAP.narrator;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: "audio/mpeg",
  };
}
