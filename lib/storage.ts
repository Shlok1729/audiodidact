import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

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
 * Checks if DigitalOcean Spaces credentials are configured.
 */
export function isSpacesConfigured(): boolean {
  return !!(
    process.env.SPACES_KEY &&
    process.env.SPACES_SECRET &&
    process.env.SPACES_BUCKET
  );
}

/**
 * Creates and returns an S3Client configured for DigitalOcean Spaces.
 */
function getSpacesClient(): S3Client | null {
  if (!isSpacesConfigured()) return null;

  const endpoint =
    process.env.SPACES_ENDPOINT ||
    `https://${process.env.SPACES_REGION || "nyc3"}.digitaloceanspaces.com`;

  return new S3Client({
    endpoint,
    region: process.env.SPACES_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_KEY!,
      secretAccessKey: process.env.SPACES_SECRET!,
    },
    forcePathStyle: false,
  });
}

/**
 * Saves a binary asset (audio file, graph JSON, diagram image) to storage.
 * If Spaces is configured, uploads to DigitalOcean Spaces with public-read ACL.
 * Always caches locally to .cache/ for fast offline access.
 */
export async function saveToStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string,
  folder = "audio"
): Promise<string> {
  // 1. Always write to local disk cache for instant local hits
  const targetDir = ensureCacheDir(folder);
  const localFilePath = path.join(targetDir, fileName);
  await fs.promises.writeFile(localFilePath, buffer);

  // 2. Upload to DigitalOcean Spaces if configured
  const spacesClient = getSpacesClient();
  const bucket = process.env.SPACES_BUCKET;

  if (spacesClient && bucket) {
    try {
      const key = `${folder}/${fileName}`;
      await spacesClient.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: "public-read",
        })
      );

      // Return Spaces CDN or Direct URL
      const endpoint =
        process.env.SPACES_ENDPOINT ||
        `https://${process.env.SPACES_REGION || "nyc3"}.digitaloceanspaces.com`;
      const cleanEndpoint = endpoint.replace(/^https?:\/\//, "");
      return `https://${bucket}.${cleanEndpoint}/${key}`;
    } catch (err) {
      console.warn("Spaces upload error (falling back to local URL):", err);
    }
  }

  // Return local API route serving this asset
  if (folder === "audio") {
    return `/api/audio/${fileName}`;
  }
  return `/api/cache/${folder}/${fileName}`;
}

/**
 * Reads a cached file from storage (local disk first, then Spaces fallback).
 */
export async function getFromStorage(
  fileName: string,
  folder = "audio"
): Promise<{ buffer: Buffer; contentType: string } | null> {
  // 1. Check local disk cache
  const localFilePath = path.join(CACHE_DIR, folder, fileName);
  if (fs.existsSync(localFilePath)) {
    const buffer = await fs.promises.readFile(localFilePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = getContentTypeByExtension(ext);
    return { buffer, contentType };
  }

  // 2. Fall back to DigitalOcean Spaces if configured
  const spacesClient = getSpacesClient();
  const bucket = process.env.SPACES_BUCKET;

  if (spacesClient && bucket) {
    try {
      const key = `${folder}/${fileName}`;
      const response = await spacesClient.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (response.Body) {
        const stream = response.Body as any;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        const buffer = Buffer.concat(chunks);
        const contentType = response.ContentType || getContentTypeByExtension(path.extname(fileName));

        // Save downloaded asset to local disk for future requests
        ensureCacheDir(folder);
        await fs.promises.writeFile(localFilePath, buffer);

        return { buffer, contentType };
      }
    } catch {
      // Key does not exist in Spaces
    }
  }

  return null;
}

function getContentTypeByExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
