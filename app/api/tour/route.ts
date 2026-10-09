import { NextRequest, NextResponse } from "next/server";
import { TourRequestSchema, TourSchema } from "@/lib/schema";
import { planTour } from "@/lib/narration";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { saveToStorage, getFromStorage } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import architectureFixture from "@/fixtures/architecture.json";
import erFixture from "@/fixtures/er.json";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TourRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body: " + parsed.error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const repoId = parsed.data.repoId;
    const tour = planTour(repoId, [architectureFixture as any, erFixture as any]);

    const isMock = process.env.USE_MOCKS === "true" || !process.env.ELEVENLABS_API_KEY;
    const ext = isMock ? "wav" : "mp3";

    // Prepare audio URLs and pre-warm step 1
    for (let i = 0; i < tour.steps.length; i++) {
      const step = tour.steps[i];
      const cacheKey = `${sha256(`${step.voiceKey}:${step.text}`)}.${ext}`;
      step.audioUrl = `/api/audio/${cacheKey}`;

      // In mock mode or for step 1, ensure the audio file exists in cache
      if (isMock || i === 0) {
        const cached = await getFromStorage(cacheKey);
        if (!cached) {
          try {
            const { buffer, contentType } = await synthesizeSpeech(step.text, step.voiceKey);
            await saveToStorage(cacheKey, buffer, contentType);
          } catch (e) {
            // Ignore background error, fallback to runtime /api/narrate
          }
        }
      }
    }

    const validatedTour = TourSchema.parse(tour);
    return NextResponse.json(validatedTour);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate tour", code: "TOUR_GENERATION_FAILED" },
      { status: 500 }
    );
  }
}
