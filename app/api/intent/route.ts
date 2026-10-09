import { NextRequest, NextResponse } from "next/server";
import { IntentRequestSchema, IntentResponseSchema } from "@/lib/schema";
import { matchIntent } from "@/lib/intent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IntentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body: " + parsed.error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const { utterance } = parsed.data;
    const result = matchIntent(utterance);
    const validated = IntentResponseSchema.parse(result);

    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to classify intent", code: "INTENT_FAILED" },
      { status: 500 }
    );
  }
}
