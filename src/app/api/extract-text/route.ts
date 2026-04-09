import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import "server-only";

export const dynamic = "force-dynamic";

const EXTRACT_PROMPT =
  "Extract ALL text content from this document verbatim. Preserve the original structure (paragraphs, bullet points, headings, tables) using plain text formatting. Return ONLY the extracted text — no commentary, no metadata, no instructions.";

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const body = await req.formData();
  const file = body.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  console.log("Extract-text file:", file.name, file.type, file.size);

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;

  // Text-readable files — return content directly
  if (
    mimeType.startsWith("text/") ||
    /\.(txt|csv|md|rtf|json|xml|yaml|yml)$/i.test(file.name)
  ) {
    const text = buffer.toString("utf-8");
    if (!text.trim()) {
      return NextResponse.json(
        { error: "File appears to be empty" },
        { status: 400 },
      );
    }
    return NextResponse.json({ text });
  }

  // PDF or Image — send to Claude for extraction
  const base64 = buffer.toString("base64");

  type ImageMediaType =
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  if (!isPdf && !isImage) {
    // Unknown binary format — try reading as text as a last resort
    const text = buffer.toString("utf-8");
    const nonPrintable = (text.match(/[\x00-\x08\x0E-\x1F]/g) || []).length;
    if (nonPrintable > text.length * 0.1) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload a PDF, image, or plain text file.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ text });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: isPdf
            ? [
                {
                  type: "document" as const,
                  source: {
                    type: "base64" as const,
                    media_type: "application/pdf" as const,
                    data: base64,
                  },
                },
                { type: "text" as const, text: EXTRACT_PROMPT },
              ]
            : [
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: mimeType as ImageMediaType,
                    data: base64,
                  },
                },
                { type: "text" as const, text: EXTRACT_PROMPT },
              ],
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract any text from this file" },
        { status: 400 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Extract-text error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
