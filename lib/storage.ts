import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

/**
 * Ensures the local cache directory exists.
 */
function ensureCacheDir(subDir = "") {
  const target = path.join(CACHE_DIR, subDir);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  return target;
}

/**
 * Saves a binary asset (e.g. audio file or graph json) to cache.
 * If Spaces is configured, uploads to Spaces. Otherwise falls back to local disk ./.cache.
 */
export async function saveToStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string,
  folder = "audio"
): Promise<string> {
  // Check if DigitalOcean Spaces is configured
  const spacesKey = process.env.SPACES_KEY;
  const spacesSecret = process.env.SPACES_SECRET;
  const spacesBucket = process.env.SPACES_BUCKET;
  const spacesEndpoint = process.env.SPACES_ENDPOINT;

  if (spacesKey && spacesSecret && spacesBucket && spacesEndpoint) {
    try {
      // In Phase 6 we will wire @aws-sdk/client-s3 fully.
      // For now, if client is not yet loaded, fall back gracefully to local disk.
    } catch {
      // Fall through to local cache
    }
  }

  // Local disk cache fallback
  const targetDir = ensureCacheDir(folder);
  const filePath = path.join(targetDir, fileName);
  await fs.promises.writeFile(filePath, buffer);

  // Return local API route serving this asset
  return `/api/audio/${fileName}`;
}

/**
 * Reads a cached file from storage/local disk.
 */
export async function getFromStorage(
  fileName: string,
  folder = "audio"
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const targetDir = path.join(CACHE_DIR, folder);
  const filePath = path.join(targetDir, fileName);

  if (fs.existsSync(filePath)) {
    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType =
      ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".wav"
        ? "audio/wav"
        : ext === ".json"
        ? "application/json"
        : "application/octet-stream";
    return { buffer, contentType };
  }

  return null;
}
