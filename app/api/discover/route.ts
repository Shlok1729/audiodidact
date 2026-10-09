import { NextRequest, NextResponse } from "next/server";
import { DiscoverRequestSchema } from "@/lib/schema";
import { discoverRepo } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DiscoverRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body: " + parsed.error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const discovery = await discoverRepo(parsed.data.repoUrl);
    return NextResponse.json(discovery);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to discover repo diagrams", code: "DISCOVER_FAILED" },
      { status: 500 }
    );
  }
}
