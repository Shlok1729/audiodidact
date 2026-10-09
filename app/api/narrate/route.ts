import { NextRequest, NextResponse } from "next/server";
import { NarrateRequestSchema, NarrateResponseSchema } from "@/lib/schema";

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

    // In Phase 0/1 mock mode, return an empty audioUrl or placeholder
    const response = {
      audioUrl: "",
    };

    const validated = NarrateResponseSchema.parse(response);
    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to narrate step", code: "NARRATE_FAILED" },
      { status: 500 }
    );
  }
}
