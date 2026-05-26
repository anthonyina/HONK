import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { EMPTY_FORM } from "@/app/lib/intake-types";
import { STRUCTURE_PROMPT, buildStepPrompt } from "@/app/lib/structure-prompt";
import "server-only";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[structure] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "Server misconfigured: missing Anthropic API key" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { transcript, step, context } = await req.json() as {
    transcript: string;
    step?: "problem" | "solution" | "background";
    context?: Record<string, unknown>;
  };

  if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const prompt = step
    ? buildStepPrompt(step, context)
    : STRUCTURE_PROMPT;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nTranscript:\n${transcript}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    const toSentenceCase = (s: string) => {
      if (!s) return s;
      return s.split(" ").map((word, i) => {
        // Preserve acronyms (all-caps words like USAA, BMW, NJM)
        if (word.length > 1 && word === word.toUpperCase()) return word;
        // Capitalize first word, lowercase the rest
        if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        return word.toLowerCase();
      }).join(" ");
    };

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[structure] No JSON found in Claude response:", text.slice(0, 200));
      return NextResponse.json({ error: "AI response did not contain valid structured data" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.title === "string") {
      parsed.title = toSentenceCase(parsed.title);
    }
    if (typeof parsed.shortDescription === "string") {
      parsed.shortDescription = toSentenceCase(parsed.shortDescription);
      if (parsed.shortDescription.length > 50) {
        parsed.shortDescription = parsed.shortDescription.slice(0, 50).trimEnd();
      }
    }
    // For step-based calls, return only the extracted fields (don't merge with EMPTY_FORM)
    if (step) {
      return NextResponse.json(parsed);
    }

    const structured = { ...EMPTY_FORM, ...parsed };
    return NextResponse.json(structured);
  } catch (error) {
    console.error("[structure] failed:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
