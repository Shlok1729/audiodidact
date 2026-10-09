import { NextRequest, NextResponse } from "next/server";
import { getFromStorage } from "@/lib/storage";

interface Params {
  params: Promise<{ filename: string }> | { filename: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolved = "then" in params ? await params : params;
    const { filename } = resolved;

    if (!filename || filename.includes("..")) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const cached = await getFromStorage(filename);
    if (!cached) {
      return new NextResponse("Audio not found", { status: 404 });
    }

    return new NextResponse(cached.buffer as any, {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Content-Length": cached.buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    return new NextResponse("Failed to load audio: " + err?.message, {
      status: 500,
    });
  }
}
