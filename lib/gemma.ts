import { DiagramGraph, DiagramGraphSchema } from "./schema";
import { VisionLLM } from "./llm";
import { sha256 } from "./hash";
import architectureFixture from "../fixtures/architecture.json";
import erFixture from "../fixtures/er.json";

export const GEMMA_SYSTEM_PROMPT = `You are an accessibility-focused diagram reader. You convert a technical diagram image into a faithful structured graph for a blind developer.

Rules:
1. Output ONLY valid JSON matching the provided schema. No prose, no markdown fences.
2. Include only nodes, edges, and labels you can actually see. Never invent components.
3. If a label is unreadable or ambiguous, still include the element with your best guess and add a note to "warnings". Lower "confidence" accordingly.
4. Preserve arrow direction exactly. Use "bidirectional" only for double-headed arrows.
5. Group nodes by the visual containers or layers in the diagram (boxes, swimlanes, colour bands). Map each group to the closest layer value.
6. For ER diagrams: nodes are tables with "details.columns"; edges are relationships with cardinality in "label".
7. "summary" must describe the system in plain language with NO visual references ("on the left", "red box", "above").

Target JSON Schema Structure:
{
  "id": string (content hash),
  "sourcePath": string,
  "type": "architecture" | "er" | "sequence" | "flowchart" | "wireframe" | "unknown",
  "title": string,
  "summary": string,
  "groups": [{ "id": string, "label": string, "layer": "frontend" | "backend" | "data" | "infra" | "external" | "other" }],
  "nodes": [{ "id": string, "label": string, "kind": string, "groupId"?: string, "description"?: string, "details"?: { "columns"?: [{ "name": string, "type"?: string, "key"?: "PK" | "FK" }] } }],
  "edges": [{ "id": string, "from": string, "to": string, "label"?: string, "direction": "forward" | "bidirectional" }],
  "confidence": number (between 0.0 and 1.0),
  "warnings": string[]
}`;

export class GemmaVision implements VisionLLM {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMMA_API_KEY || "";
    this.baseUrl = process.env.GEMMA_BASE_URL || "";
    this.model = process.env.GEMMA_MODEL || "gemma-3-27b-it";
  }

  async extractGraph(image: Buffer, mime: string, hint?: string): Promise<DiagramGraph> {
    const isMock = process.env.USE_MOCKS === "true" || !this.apiKey;

    // In mock mode, return fixture with real hash computed from the image
    if (isMock) {
      const lowerHint = (hint || "").toLowerCase();
      const imageHash = image && image.length > 0 ? sha256(image) : "mock-diagram-hash";
      if (lowerHint.includes("er") || lowerHint.includes("schema") || lowerHint.includes("database")) {
        return {
          ...(erFixture as DiagramGraph),
          id: imageHash,
          sourcePath: hint || "docs/schema_er.png",
        };
      }
      return {
        ...(architectureFixture as DiagramGraph),
        id: imageHash,
        sourcePath: hint || "docs/architecture.png",
      };
    }

    // Call live model with retry
    return this.callModelWithRetry(image, mime, hint);
  }

  private async callModelWithRetry(
    image: Buffer,
    mime: string,
    hint?: string,
    retryError?: string
  ): Promise<DiagramGraph> {
    const base64Image = image.toString("base64");
    const imageHash = sha256(image);

    let promptText = `Analyze this technical diagram image (path: "${hint || "unknown"}") and extract the full DiagramGraph JSON.`;
    if (retryError) {
      promptText += `\n\nCRITICAL FIX: Your previous JSON output failed schema validation with error: ${retryError}. Ensure strict compliance with the required schema and return ONLY valid JSON.`;
    }

    let rawJson = "";

    // Support OpenAI-compatible endpoint (e.g. vLLM / Groq / OpenRouter / DigitalOcean Droplet)
    if (this.baseUrl) {
      const endpoint = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: GEMMA_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${base64Image}` },
                },
              ],
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vision model API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      rawJson = data.choices?.[0]?.message?.content || "";
    } else {
      // Default to Google AI Studio / Gemini API endpoint
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: GEMMA_SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mime,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google AI API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Strip optional markdown fences if present
    const cleanedJson = rawJson.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    try {
      const parsedObj = JSON.parse(cleanedJson);
      // Ensure id and sourcePath
      if (!parsedObj.id) parsedObj.id = imageHash;
      if (!parsedObj.sourcePath) parsedObj.sourcePath = hint || "unknown";

      const validated = DiagramGraphSchema.safeParse(parsedObj);
      if (validated.success) {
        return validated.data;
      }

      // If validation fails and we haven't retried yet, retry once
      if (!retryError) {
        return this.callModelWithRetry(image, mime, hint, validated.error.message);
      }

      throw new Error(`Zod validation failed: ${validated.error.message}`);
    } catch (parseErr: any) {
      if (!retryError) {
        return this.callModelWithRetry(image, mime, hint, parseErr.message);
      }
      throw parseErr;
    }
  }
}
