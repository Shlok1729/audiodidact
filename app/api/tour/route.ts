import { NextRequest, NextResponse } from "next/server";
import { TourRequestSchema, TourSchema } from "@/lib/schema";
import { planTour } from "@/lib/narration";
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
    // In Phase 0/1 mock mode, plan tour directly from fixtures
    const tour = planTour(repoId, [architectureFixture as any, erFixture as any]);
    const validatedTour = TourSchema.parse(tour);

    return NextResponse.json(validatedTour);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate tour", code: "TOUR_GENERATION_FAILED" },
      { status: 500 }
    );
  }
}
