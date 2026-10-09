import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema, DiagramGraphSchema } from "@/lib/schema";
import { getVisionLLM } from "@/lib/llm";
import { saveToStorage, getFromStorage } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import fs from "fs";
import path from "path";

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

    const { repoId, path: diagramPath } = parsed.data;

    // Load or fetch image buffer
    let imageBuffer: Buffer = Buffer.from("");
    let mime = "image/png";

    // 1. Check local fixtures / filesystem first
    const localFixturePath = path.join(process.cwd(), "fixtures", diagramPath);
    const localRepoPath = path.join(process.cwd(), diagramPath);

    if (fs.existsSync(localFixturePath)) {
      imageBuffer = await fs.promises.readFile(localFixturePath);
    } else if (fs.existsSync(localRepoPath)) {
      imageBuffer = await fs.promises.readFile(localRepoPath);
    } else {
      // 2. Fetch from GitHub raw content
      try {
        const ghUrl = `https://raw.githubusercontent.com/${repoId}/main/${diagramPath}`;
        const ghRes = await fetch(ghUrl);
        if (ghRes.ok) {
          const ab = await ghRes.arrayBuffer();
          imageBuffer = Buffer.from(ab);
          const ct = ghRes.headers.get("content-type");
          if (ct) mime = ct;
        }
      } catch {
        // Fallback to empty buffer for mock mode
      }
    }

    if (diagramPath.endsWith(".jpg") || diagramPath.endsWith(".jpeg")) {
      mime = "image/jpeg";
    } else if (diagramPath.endsWith(".svg")) {
      mime = "image/svg+xml";
    }

    const imageHash = imageBuffer.length > 0 ? sha256(imageBuffer) : sha256(diagramPath);
    const cacheKey = `${imageHash}.json`;

    // Check if graph is already cached by image content hash
    const cached = await getFromStorage(cacheKey, "graphs");
    if (cached) {
      try {
        const cachedGraph = JSON.parse(cached.buffer.toString("utf-8"));
        const validatedCached = DiagramGraphSchema.parse(cachedGraph);
        return NextResponse.json(validatedCached);
      } catch {
        // Invalid cache entry, recompute
      }
    }

    // Call VisionLLM provider
    const vision = getVisionLLM();
    const graph = await vision.extractGraph(imageBuffer, mime, diagramPath);
    graph.id = imageHash;
    graph.sourcePath = diagramPath;

    const validated = DiagramGraphSchema.parse(graph);

    // Save to storage cache
    await saveToStorage(
      cacheKey,
      Buffer.from(JSON.stringify(validated, null, 2)),
      "application/json",
      "graphs"
    );

    return NextResponse.json(validated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to analyze diagram", code: "ANALYZE_FAILED" },
      { status: 500 }
    );
  }
}
