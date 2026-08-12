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

/**
 * Builds a bullet list from raw lines, or returns null if nothing survives.
 *
 * Jira rejects the whole issue with a 400 ("The field value is not valid
 * Atlassian Document Format (ADF) content") if a bulletList has zero listItems,
 * so a field holding only newlines or bare "-" bullets must produce no list at
 * all rather than an empty one. Callers must skip the section on null.
 */
export function plainBulletList(lines: string[]): AdfNode | null {
  const items = lines
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  return adfBulletList(items.map((l) => [adfText(l)]));
}

/** Appends a heading + bullet list, or nothing at all when there is no content. */
function pushBulletSection(nodes: AdfNode[], heading: string, raw: string) {
  if (!raw) return;
  const list = plainBulletList(raw.split("\n"));
  if (!list) return;
  nodes.push(adfHeading(heading, 2));
  nodes.push(list);
}

/**
 * Jira caps a description at 32767 characters, failing the whole create with
 * "The entered text is too long..." (confirmed against the live API).
 *
 * The count is NOT of the raw text: each block node carries its own overhead,
 * so the text budget shrinks as the document gains structure. Measured by
 * bisecting the live API — the largest accepted text was 32734 chars in a
 * single block but only 27200 spread across 1600 blocks, i.e. ~3.5 chars of
 * overhead per block. Budget conservatively (4/block, 31.5k ceiling): the cost
 * of trimming an absurdly long submission early is nothing next to losing it.
 */
const MAX_DESCRIPTION_TOTAL = 32_000;
const BLOCK_COST = 4;
const TRUNCATION_MARKER = "… [truncated]";

function eachNode(node: unknown, visit: (n: Record<string, unknown>) => boolean): void {
  if (Array.isArray(node)) return node.forEach((c) => eachNode(c, visit));
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  if (visit(n)) eachNode(n.content, visit);
}

function enforceTextLimit(doc: AdfNode, total = MAX_DESCRIPTION_TOTAL): AdfNode {
  // Pass 1: count blocks. The text budget cannot be decided greedily while
  // walking, because the overhead owed to blocks further down the document is
  // not yet known — spend it all early and the tail pushes the total over.
  let blocks = 0;
  eachNode(doc.content, (n) => {
    if (n.type !== "text") blocks++;
    return true;
  });

  // Pass 2: spend what is left on text.
  let remaining = total - blocks * BLOCK_COST;
  eachNode(doc.content, (n) => {
    if (n.type !== "text" || typeof n.text !== "string") return true;
    if (remaining <= 0) {
      // Budget spent. Emptying the text costs nothing against the limit and
      // keeps every container non-empty, which is what Jira actually
      // validates — an empty text node is accepted, an empty bulletList or
      // listItem is not.
      n.text = "";
    } else if (n.text.length <= remaining) {
      remaining -= n.text.length;
    } else {
      n.text = n.text.slice(0, Math.max(0, remaining - TRUNCATION_MARKER.length)) + TRUNCATION_MARKER;
      remaining = 0;
    }
    return false;
  });
  return doc;
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
  if (data.impact) nodes.push(adfParagraph(adfText(`Impact: ${data.impact}`)));

  if (data.additionalBackground) {
    nodes.push(adfHeading("Additional Background", 2));
    nodes.push(adfParagraph(adfText(data.additionalBackground)));
  }

  pushBulletSection(nodes, "Functional Requirements", data.functionalRequirements);
  pushBulletSection(nodes, "Risks", data.risks);
  pushBulletSection(nodes, "Go to Market", data.goToMarket);

  // A link with no description, or an attachment with no description, would put
  // an empty text node in the list — label those with the URL / filename instead.
  const resources = (data.resources ?? []).filter((r) =>
    r.type === "link" ? Boolean(r.url) : Boolean(r.name)
  );
  if (resources.length > 0) {
    nodes.push(adfHeading("Additional Resources", 2));
    nodes.push(
      adfBulletList(
        resources.map((r) =>
          r.type === "link"
            ? [adfLink(r.description.trim() || r.url, r.url)]
            : r.description.trim()
              ? [adfText(r.description.trim()), adfText(` (attachment: ${r.name})`)]
              : [adfText(`Attachment: ${r.name}`)]
        )
      )
    );
  }

  if (data.platform || data.clientName) {
    nodes.push(adfHeading("Platform & Client", 2));
    if (data.platform) nodes.push(adfParagraph(adfText(`Platform: ${data.platform}`)));
    if (data.clientName) nodes.push(adfParagraph(adfText(`Client: ${data.clientName}`)));
  }

  nodes.push(adfHeading("Submitter", 2));
  const timelineLabel = data.timeline
    ? new Date(data.timeline + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";
  nodes.push(adfParagraph(adfText(`Submitted by ${data.yourName}. Desired timeline: ${timelineLabel}.`)));

  return enforceTextLimit(adfDoc(...nodes));
}
