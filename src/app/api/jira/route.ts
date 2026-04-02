import { NextRequest, NextResponse } from "next/server";
import "server-only";
import type { IntakeFormData } from "@/app/lib/intake-types";

// Atlassian Cloud REST API v3
// Auth: Basic base64("email:api_token") — all server-side, never exposed to client
// Required env vars:
//   ATLASSIAN_EMAIL        — service account email
//   ATLASSIAN_API_TOKEN    — generated at id.atlassian.com/manage-profile/security/api-tokens
//   ATLASSIAN_SITE_URL     — e.g. "yourcompany.atlassian.net"
//   JIRA_PROJECT_KEY       — e.g. "PROD" (the Product Discovery project key)

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

// Atlassian Document Format (ADF) helpers
type AdfNode = Record<string, unknown>;

function adfDoc(...content: AdfNode[]) {
  return { version: 1, type: "doc", content };
}

function adfHeading(text: string, level: 1 | 2 | 3 = 2): AdfNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function adfText(text: string): AdfNode {
  return { type: "text", text };
}

function adfBold(text: string): AdfNode {
  return { type: "text", text, marks: [{ type: "strong" }] };
}

function adfLink(text: string, href: string): AdfNode {
  return { type: "text", text, marks: [{ type: "link", attrs: { href } }] };
}

function adfParagraph(...nodes: AdfNode[]): AdfNode {
  return { type: "paragraph", content: nodes };
}

function adfBulletList(items: AdfNode[][]): AdfNode {
  return {
    type: "bulletList",
    content: items.map((nodes) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: nodes }],
    })),
  };
}

function plainBulletList(lines: string[]): AdfNode {
  return adfBulletList(
    lines.filter(Boolean).map((l) => [adfText(l.replace(/^-\s*/, ""))])
  );
}

function buildDescription(data: IntakeFormData): AdfNode {
  const nodes: AdfNode[] = [];

  // Problem Abstract — bold template labels, plain user content
  nodes.push(adfHeading("Problem Abstract", 2));
  nodes.push(adfParagraph(adfBold("Today, when a "), adfText(data.customer)));
  nodes.push(adfParagraph(adfBold("Attempts to "), adfText(data.action)));
  nodes.push(adfParagraph(adfBold("The result is "), adfText(data.outcome)));

  // Hypothesis
  nodes.push(adfHeading("Hypothesis", 2));
  nodes.push(adfParagraph(adfBold("We believe that "), adfText(data.idea)));
  nodes.push(adfParagraph(adfBold("Will result in "), adfText(data.whySolves)));
  nodes.push(adfParagraph(
    adfBold("We will know if this is true if "),
    adfText(data.metric),
    adfBold(" is "),
    adfText(data.metricDirection),
  ));

  // Value
  nodes.push(adfHeading("Value", 2));
  nodes.push(adfParagraph(adfText(`Increment volume: ${data.incrementVolume}`)));
  nodes.push(adfParagraph(adfText(`Contract value: ${data.contractValue}`)));
  nodes.push(adfParagraph(adfText(`Client retention risk: ${data.retentionRisk}`)));

  if (data.additionalBackground) {
    nodes.push(adfHeading("Additional Background", 2));
    nodes.push(adfParagraph(adfText(data.additionalBackground)));
  }

  if (data.functionalRequirements) {
    nodes.push(adfHeading("Functional Requirements", 2));
    nodes.push(plainBulletList(data.functionalRequirements.split("\n")));
  }

  if (data.risks) {
    nodes.push(adfHeading("Risks", 2));
    nodes.push(plainBulletList(data.risks.split("\n")));
  }

  if (data.goToMarket) {
    nodes.push(adfHeading("Go to Market", 2));
    nodes.push(plainBulletList(data.goToMarket.split("\n")));
  }

  const resources = data.resources ?? [];
  if (resources.length > 0) {
    nodes.push(adfHeading("Additional Resources", 2));
    nodes.push(
      adfBulletList(
        resources.map((r) =>
          r.type === "link"
            ? [adfLink(r.description, r.url)]
            : [adfText(r.description), adfText(` (attachment: ${r.name})`)]
        )
      )
    );
  }

  nodes.push(adfHeading("Submitter", 2));
  const timelineLabel = data.timeline
    ? new Date(data.timeline + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";
  nodes.push(adfParagraph(adfText(`Submitted by ${data.yourName}. Desired timeline: ${timelineLabel}.`)));

  return adfDoc(...nodes);
}

export async function POST(req: NextRequest) {
  const data = (await req.json()) as IntakeFormData;

  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!siteUrl || !projectKey) {
    return NextResponse.json(
      { error: "Jira environment variables not configured" },
      { status: 500 },
    );
  }

  // TODO: confirm the issuetype name for Product Discovery ideas in your project.
  // Common values: "Idea", "Epic" — check via:
  // GET https://{site}/rest/api/3/project/{projectKey}/issuetypes
  const payload = {
    fields: {
      project: { key: projectKey },
      summary: data.title,
      issuetype: { name: "Idea" },
      description: buildDescription(data),
      customfield_10075: data.shortDescription || undefined,
      customfield_10071: data.timeline || undefined,
      // TODO: map custom fields once you have the project field IDs.
      // Custom field IDs can be found via:
      // GET https://{site}/rest/api/3/field
      // Example: customfield_10000: data.incrementVolume
    },
  };

  const res = await fetch(`https://${siteUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Jira API error", { status: res.status, error });
    return NextResponse.json(
      { error: "Failed to create Jira issue", detail: error },
      { status: res.status },
    );
  }

  const created = await res.json() as { key: string; id: string };
  return NextResponse.json({ key: created.key, id: created.id });
}
