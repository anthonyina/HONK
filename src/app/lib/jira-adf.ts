import type { IntakeFormData } from "@/app/lib/intake-types";

export type AdfNode = Record<string, unknown>;

export function adfDoc(...content: AdfNode[]) {
  return { version: 1, type: "doc", content };
}

export function adfHeading(text: string, level: 1 | 2 | 3 = 2): AdfNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

export function adfText(text: string): AdfNode {
  return { type: "text", text };
}

export function adfBold(text: string): AdfNode {
  return { type: "text", text, marks: [{ type: "strong" }] };
}

export function adfLink(text: string, href: string): AdfNode {
  return { type: "text", text, marks: [{ type: "link", attrs: { href } }] };
}

export function adfParagraph(...nodes: AdfNode[]): AdfNode {
  return { type: "paragraph", content: nodes };
}

export function adfBulletList(items: AdfNode[][]): AdfNode {
  return {
    type: "bulletList",
    content: items.map((nodes) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: nodes }],
    })),
  };
}

export function plainBulletList(lines: string[]): AdfNode {
  return adfBulletList(
    lines.filter(Boolean).map((l) => [adfText(l.replace(/^-\s*/, ""))])
  );
}

export function buildDescription(data: IntakeFormData): AdfNode {
  const nodes: AdfNode[] = [];

  nodes.push(adfHeading("Problem Abstract", 2));
  nodes.push(adfParagraph(adfBold("Today, when a "), adfText(data.customer)));
  nodes.push(adfParagraph(adfBold("Attempts to "), adfText(data.action)));
  nodes.push(adfParagraph(adfBold("The result is "), adfText(data.outcome)));

  nodes.push(adfHeading("Hypothesis", 2));
  nodes.push(adfParagraph(adfBold("We believe that "), adfText(data.idea)));
  nodes.push(adfParagraph(adfBold("Will result in "), adfText(data.whySolves)));
  nodes.push(adfParagraph(
    adfBold("We will know if this is true if "),
    adfText(data.metric),
    adfBold(" is "),
    adfText(data.metricDirection),
  ));

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
