import { NextRequest, NextResponse } from "next/server";
import { TourRequestSchema, TourSchema, DiagramGraph } from "@/lib/schema";
import { discoverRepo } from "@/lib/github";
import { getVisionLLM } from "@/lib/llm";
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

    const { repoId } = parsed.data;
    const isMock = process.env.USE_MOCKS === "true" || !process.env.GEMMA_API_KEY;

    // 1. Discover diagrams in repo
    const discovery = await discoverRepo(repoId);
    const diagrams: DiagramGraph[] = [];
    const vision = getVisionLLM();

    // 2. Analyze diagrams (with content-hashed cache)
    for (const d of discovery.diagrams) {
      try {
        let imageBuffer = Buffer.from("");
        let mime = "image/png";

        // Attempt fetching image bytes if rawUrl provided
        if (d.rawUrl && !isMock) {
          try {
            const imgRes = await fetch(d.rawUrl);
            if (imgRes.ok) {
              const ab = await imgRes.arrayBuffer();
              imageBuffer = Buffer.from(ab);
              const ct = imgRes.headers.get("content-type");
              if (ct) mime = ct;
            }
          } catch {
            // Fetch failed, use mock/hint fallback
          }
        }

        const imageHash = imageBuffer.length > 0 ? sha256(imageBuffer) : sha256(d.path);
        const cacheKey = `${imageHash}.json`;

        const cached = await getFromStorage(cacheKey, "graphs");
        if (cached) {
          diagrams.push(JSON.parse(cached.buffer.toString("utf-8")));
        } else {
          const graph = await vision.extractGraph(imageBuffer, mime, d.path);
          graph.id = imageHash;
          graph.sourcePath = d.path;

          await saveToStorage(
            cacheKey,
            Buffer.from(JSON.stringify(graph, null, 2)),
            "application/json",
            "graphs"
          );
          diagrams.push(graph);
        }
      } catch {
        // Fallback for this diagram
      }
    }

    // If analysis produced no diagrams, fall back to fixtures
    if (diagrams.length === 0) {
      diagrams.push(architectureFixture as DiagramGraph);
      diagrams.push(erFixture as DiagramGraph);
    }

    // 3. Plan deterministic narration tour
    const tour = planTour(repoId, diagrams);
    const ext = isMock ? "wav" : "mp3";

    // 4. Orchestrate audio: synthesize Step 1 first, rest in background
    for (let i = 0; i < tour.steps.length; i++) {
      const step = tour.steps[i];
      const audioKey = `${sha256(`${step.voiceKey}:${step.text}`)}.${ext}`;
      step.audioUrl = `/api/audio/${audioKey}`;

      // Step 1 generated immediately
      if (i === 0 || isMock) {
        const cached = await getFromStorage(audioKey);
        if (!cached) {
          try {
            const { buffer, contentType } = await synthesizeSpeech(step.text, step.voiceKey);
            await saveToStorage(audioKey, buffer, contentType);
          } catch {
            // Audio generation error non-fatal
          }
        }
      } else {
        // Background synthesis for subsequent steps
        (async () => {
          try {
            const cached = await getFromStorage(audioKey);
            if (!cached) {
              const { buffer, contentType } = await synthesizeSpeech(step.text, step.voiceKey);
              await saveToStorage(audioKey, buffer, contentType);
            }
          } catch {
            // Ignore async background errors
          }
        })();
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
