import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { EMPTY_FORM } from "@/app/lib/intake-types";
import "server-only";

const SYSTEM_PROMPT = `You are a product manager assistant. Given a voice transcript of a product intake, extract and structure the information into a JSON object with exactly these fields:

- title: A short (5-8 word) summary title. Must be sentence case: capitalise only the first word and any proper nouns.
- shortDescription: An alternate title that works together with the main title — not a summary of it. The title and shortDescription should complement each other: the title names the feature or fix, the shortDescription adds the "so that" or "because" context that the title omits. Do NOT restate the title or repeat its words. Think of them as a headline + subheadline pair that together tell the full story. STRICT LIMIT: must be 50 characters or fewer. Count every character including spaces. If your draft exceeds 50 characters, shorten it until it fits.
These six fields are inserted verbatim into fixed template sentences. The value you write must read naturally and grammatically when dropped into its slot — correct tense, case, and form. Do not capitalise the first letter. Do not start with a verb in imperative form.

Template sentences for reference:
  "Today, when a [customer] attempts to [action], the result is [outcome]."
  "We believe that [idea] will result in [whySolves]. We will know if this is true if [metric] is [metricDirection]."

- customer: a noun or noun phrase for the person — lowercase, no article (the template adds "a"). Good: "stranded motorist". Bad: "The Motorist", "motorists".
- action: an infinitive verb phrase without "to" — lowercase. Good: "track job statuses in real time". Bad: "Track job statuses", "tracking job statuses", "they want to track…".
- outcome: a noun phrase describing the bad result — lowercase. Good: "insufficient visibility into job progress". Bad: "Insufficient visibility", "there is insufficient visibility".
- idea: a gerund or noun phrase for the solution — lowercase, must flow after "We believe that". Good: "adding granular status milestones to the provider portal". Bad: "Add granular status milestones", "we should add…".
- whySolves: a noun phrase or clause for the positive result — lowercase, must flow after "will result in". Good: "providers and clients having full visibility into job progress". Bad: "Providers will have visibility", "better visibility".
- metric: a noun phrase for what will be measured — lowercase. Good: "inbound dispatcher call volume per job". Bad: "Inbound call volume", "we will measure calls".
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
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

  const toSentenceCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  if (typeof parsed.title === "string") {
    parsed.title = toSentenceCase(parsed.title);
  }
  if (typeof parsed.shortDescription === "string") {
    parsed.shortDescription = toSentenceCase(parsed.shortDescription);
    if (parsed.shortDescription.length > 50) {
      parsed.shortDescription = parsed.shortDescription.slice(0, 50).trimEnd();
    }
  }
  const structured = { ...EMPTY_FORM, ...parsed };

  return NextResponse.json(structured);
}
