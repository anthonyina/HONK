import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { EMPTY_FORM } from "@/app/lib/intake-types";
import "server-only";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a product manager assistant. Given a voice transcript of a product intake, extract and structure the information into a JSON object with exactly these fields:

- title: A short (5-8 word) summary title
- shortDescription: An alternate title that works together with the main title — not a summary of it. The title and shortDescription should complement each other: the title names the feature or fix, the shortDescription adds the "so that" or "because" context that the title omits. Do NOT restate the title or repeat its words. Think of them as a headline + subheadline pair that together tell the full story. STRICT LIMIT: must be 50 characters or fewer. Count every character including spaces. If your draft exceeds 50 characters, shorten it until it fits.
- customer: Who is the customer or user
- action: What they are trying to accomplish
- outcome: The undesirable result of the current situation
- idea: The proposed idea or solution
- whySolves: Why this idea solves the problem
- metric: The success metric
- metricDirection: "increased" or "decreased"
- incrementVolume: Estimate of incremental job volume or usage
- contractValue: Any revenue or contract value mentioned
- retentionRisk: "Low", "Medium", or "High"
- additionalBackground: Any context that doesn't fit above
- functionalRequirements: Key requirements as a bulleted list (- item per line)
- risks: Any risks as a bulleted list (- item per line)
- goToMarket: Release/communication notes as a bulleted list (- item per line)
- yourName: ""
- timeline: ""

Use "" for any field not mentioned. Return ONLY valid JSON.`;

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();

  if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${SYSTEM_PROMPT}\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  if (typeof parsed.shortDescription === "string" && parsed.shortDescription.length > 50) {
    parsed.shortDescription = parsed.shortDescription.slice(0, 50).trimEnd();
  }
  const structured = { ...EMPTY_FORM, ...parsed };

  return NextResponse.json(structured);
}
