import { NextRequest, NextResponse } from "next/server";
import { AskRequestSchema, AskResponseSchema } from "@/lib/schema";
import { getQAAgent } from "@/lib/llm";
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
    const qa = getQAAgent();
    const answer = await qa.ask(repoId, question, {
      diagrams: [architectureFixture as any, erFixture as any],
    });

    const response = {
      ...answer,
      audioUrl: undefined,
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
