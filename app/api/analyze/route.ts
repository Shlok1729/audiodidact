import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema, DiagramGraphSchema } from "@/lib/schema";
import { getVisionLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body: " + parsed.error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const { path } = parsed.data;
    const vision = getVisionLLM();
    const graph = await vision.extractGraph(Buffer.from(""), "image/png", path);
    const validated = DiagramGraphSchema.parse(graph);

    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to analyze diagram", code: "ANALYZE_FAILED" },
      { status: 500 }
    );
  }
}
