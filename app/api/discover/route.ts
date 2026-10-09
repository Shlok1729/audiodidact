import { NextRequest, NextResponse } from "next/server";
import { DiscoverRequestSchema, DiscoverResponseSchema } from "@/lib/schema";

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

    // Parse repo owner/repo from URL
    const url = parsed.data.repoUrl.trim().replace(/^https?:\/\/github\.com\//, "");
    const parts = url.split("/").filter(Boolean);
    const repoId = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "audiodidact/demo";

    const response = {
      repoId,
      diagrams: [
        {
          path: "docs/architecture.png",
          rawUrl: "https://raw.githubusercontent.com/audiodidact/demo/main/docs/architecture.png",
          referencedFrom: "README.md",
        },
        {
          path: "docs/schema_er.png",
          rawUrl: "https://raw.githubusercontent.com/audiodidact/demo/main/docs/schema_er.png",
          referencedFrom: "docs/DATABASE.md",
        },
      ],
      goodFirstIssues: [
        {
          id: 101,
          number: 1,
          title: "Improve keyboard focus styles on navigation tabs",
          html_url: `https://github.com/${repoId}/issues/1`,
          labels: ["good first issue", "accessibility"],
          relatedNodeId: "web-ui",
        },
        {
          id: 102,
          number: 2,
          title: "Add health check endpoint to API Gateway",
          html_url: `https://github.com/${repoId}/issues/2`,
          labels: ["good first issue", "backend"],
          relatedNodeId: "api-gateway",
        },
      ],
    };

    const validated = DiscoverResponseSchema.parse(response);
    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to discover repo diagrams", code: "DISCOVER_FAILED" },
      { status: 500 }
    );
  }
}
