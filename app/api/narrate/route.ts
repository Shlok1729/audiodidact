import { NextRequest, NextResponse } from "next/server";
import { NarrateRequestSchema, NarrateResponseSchema } from "@/lib/schema";
import { synthesizeSpeech, VOICE_MAP } from "@/lib/elevenlabs";
import { saveToStorage, getFromStorage } from "@/lib/storage";
import { sha256 } from "@/lib/hash";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = NarrateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body: " + parsed.error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const { text, voiceKey } = parsed.data;
    const isMock = process.env.USE_MOCKS === "true" || !process.env.ELEVENLABS_API_KEY;
    const ext = isMock ? "wav" : "mp3";
    const voiceId = VOICE_MAP[voiceKey] || VOICE_MAP.narrator;
    const cacheKey = `${sha256(`${voiceId}:${text}`)}.${ext}`;

    // Check if audio is already cached
    const existing = await getFromStorage(cacheKey);
    let audioUrl = `/api/audio/${cacheKey}`;

    if (!existing) {
      const { buffer, contentType } = await synthesizeSpeech(text, voiceKey);
      audioUrl = await saveToStorage(cacheKey, buffer, contentType);
    }

    const validated = NarrateResponseSchema.parse({ audioUrl });
    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to narrate step", code: "NARRATE_FAILED" },
      { status: 500 }
    );
  }
}
