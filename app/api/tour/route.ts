import { NextRequest, NextResponse } from "next/server";
import { TourRequestSchema, TourSchema, DiagramGraph } from "@/lib/schema";
import { discoverRepo } from "@/lib/github";
import { getVisionLLM } from "@/lib/llm";
import { planTour } from "@/lib/narration";
import { synthesizeSpeech, VOICE_MAP } from "@/lib/elevenlabs";
import { saveToStorage, getFromStorage } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import { parseArchitectureFromMarkdown, parseSchemaFromMarkdown } from "@/lib/markdown-arch";
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
    const isMockAudio = process.env.USE_MOCKS === "true" || !process.env.ELEVENLABS_API_KEY;

    // 1. Discover diagrams in repo
    const discovery = await discoverRepo(repoId);
    const diagrams: DiagramGraph[] = [];
    const vision = getVisionLLM();

    // 2. Analyze diagrams (with content-hashed cache)
    for (const d of discovery.diagrams) {
      try {
        // If it's a documentation markdown file, parse directly into DiagramGraph!
        if (d.path.endsWith(".md")) {
          let mdText = "";
          if (d.rawUrl) {
            try {
              const mdRes = await fetch(d.rawUrl);
              if (mdRes.ok) mdText = await mdRes.text();
            } catch {
              // Fetch failed
            }
          }
          if (mdText) {
            const isSchema = d.path.toLowerCase().includes("schema") || d.path.toLowerCase().includes("er");
            const graph = isSchema
              ? parseSchemaFromMarkdown(mdText, d.path)
              : parseArchitectureFromMarkdown(mdText, d.path);
            if (graph && graph.nodes.length > 0) {
              diagrams.push(graph);
              continue;
            }
          }
        }

        let imageBuffer = Buffer.from("");
        let mime = "image/png";

        // Attempt fetching image bytes if rawUrl provided
        if (d.rawUrl) {
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
    const ext = isMockAudio ? "wav" : "mp3";

    // 4. Orchestrate audio: synthesize steps with real ElevenLabs female voices
    for (const step of tour.steps) {
      const voiceId = VOICE_MAP[step.voiceKey] || VOICE_MAP.narrator;
      const audioKey = `${sha256(`${voiceId}:${step.text}`)}.${ext}`;
      step.audioUrl = `/api/audio/${audioKey}`;

      const cached = await getFromStorage(audioKey);
      if (!cached) {
        try {
          const { buffer, contentType } = await synthesizeSpeech(step.text, step.voiceKey);
          await saveToStorage(audioKey, buffer, contentType);
        } catch (err) {
          console.error("Audio generation failed for step:", step.id, err);
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
