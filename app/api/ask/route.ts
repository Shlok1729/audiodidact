import { NextRequest, NextResponse } from "next/server";
import { AskRequestSchema, AskResponseSchema, DiagramGraph } from "@/lib/schema";
import { getQAAgent } from "@/lib/llm";
import { synthesizeSpeech, VOICE_MAP } from "@/lib/elevenlabs";
import { saveToStorage, getFromStorage } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import architectureFixture from "@/fixtures/architecture.json";
import erFixture from "@/fixtures/er.json";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body: " + parsed.error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const { repoId, question, currentStepId } = parsed.data;
    const clientDiagrams = Array.isArray(body.diagrams) && body.diagrams.length > 0 ? body.diagrams : undefined;
    const qa = getQAAgent();

    const answer = await qa.ask(repoId, question, {
      diagrams: clientDiagrams || [architectureFixture as DiagramGraph, erFixture as DiagramGraph],
    });

    // Synthesize audio for the agent's answer
    let audioUrl: string | undefined = undefined;
    try {
      const isMock = process.env.USE_MOCKS === "true" || !process.env.ELEVENLABS_API_KEY;
      const ext = isMock ? "wav" : "mp3";
      const voiceId = VOICE_MAP.narrator;
      const audioKey = `${sha256(`${voiceId}:${answer.text}`)}.${ext}`;

      const cachedAudio = await getFromStorage(audioKey);
      if (cachedAudio) {
        audioUrl = `/api/audio/${audioKey}`;
      } else {
        const { buffer, contentType } = await synthesizeSpeech(answer.text, "narrator");
        audioUrl = await saveToStorage(audioKey, buffer, contentType);
      }
    } catch {
      // Audio synthesis error non-fatal, client can still show and read text
    }

    const response = {
      ...answer,
      audioUrl,
    };

    const validated = AskResponseSchema.parse(response);
    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process question", code: "ASK_FAILED" },
      { status: 500 }
    );
  }
}
