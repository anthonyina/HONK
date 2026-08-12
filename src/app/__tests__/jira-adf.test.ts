import { describe, it, expect } from "vitest";
import { buildDescription, plainBulletList } from "@/app/lib/jira-adf";
import { normalizeSummary } from "@/pages/api/submit";
import { EMPTY_FORM, DEMO_DATA } from "@/app/lib/intake-types";
import type { AdfNode } from "@/app/lib/jira-adf";

// Confirmed against the live Jira API by bisection: a description is capped at
// 32767 chars, but each block node carries ~3.5 chars of overhead, so the text
// budget shrinks as the document gains structure.
const JIRA_DESCRIPTION_LIMIT = 32_767;

function renderedSize(doc: AdfNode): number {
  let text = 0;
  let blocks = 0;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "text") {
      text += String(n.text ?? "").length;
      return;
    }
    blocks++;
    walk(n.content);
  };
  walk(doc.content);
  return text + Math.ceil(blocks * 3.5);
}

// Jira rejects the entire create call with a 400 — "The field value is not valid
// Atlassian Document Format (ADF) content" — if the description contains an
// empty container: a bulletList with no listItems, or a listItem with no
// content. Both were confirmed against the live Jira validator.
//
// Deliberately NOT flagged here: a text node whose text is "". That is invalid
// per the ADF spec but Jira accepts it (verified: HTTP 201), so treating it as
// a 400 cause sends you chasing the wrong bug. It is a rendering blemish only.
function invalidNodes(node: unknown, acc: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const child of node) invalidNodes(child, acc);
    return acc;
  }
  if (node && typeof node === "object") {
    const n = node as Record<string, unknown>;
    const content = n.content as unknown[] | undefined;
    if (n.type === "bulletList" && (!content || content.length === 0)) {
      acc.push("empty bulletList");
    }
    if (n.type === "listItem" && (!content || content.length === 0)) {
      acc.push("empty listItem");
    }
    for (const value of Object.values(n)) invalidNodes(value, acc);
  }
  return acc;
}

/** Concatenated text of a node and its descendants. */
function textOf(node: unknown): string {
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object") {
    const n = node as Record<string, unknown>;
    if (n.type === "text") return String(n.text ?? "");
    return textOf(n.content);
  }
  return "";
}

/** The rendered text of every bullet in the document, in order. */
function bulletTexts(doc: AdfNode): string[] {
  const items: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      const n = node as Record<string, unknown>;
      if (n.type === "listItem") items.push(textOf(n.content));
      else walk(n.content);
    }
  };
  walk(doc.content);
  return items;
}

const BULLET_FIELDS = ["functionalRequirements", "risks", "goToMarket"] as const;

// Values that are truthy — so they pass the `if (data.field)` guard — but hold
// no actual bullet content. Users produce these by typing into a multiline
// field and then clearing it, leaving the newlines behind.
const CONTENTLESS = ["\n", "\n\n", "\n\n\n", "-", "- ", "-\n-", "   ", "\n \n"];

describe("plainBulletList", () => {
  it("returns null when no line has content", () => {
    for (const value of CONTENTLESS) {
      expect(plainBulletList(value.split("\n")), JSON.stringify(value)).toBeNull();
    }
  });

  it("strips bullet markers and drops blank lines", () => {
    const list = plainBulletList(["- first", "", "  - second", "third"]) as AdfNode;
    expect(list).not.toBeNull();
    // Assert the rendered text, not just the count — a count-only assertion
    // passes even if the marker is left in place.
    expect(bulletTexts({ type: "doc", content: [list] })).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(invalidNodes(list)).toEqual([]);
  });
});

describe("normalizeSummary", () => {
  it("returns empty for a blank title so the caller can reject it", () => {
    for (const blank of ["", "   ", "\n", "\t\n "]) {
      expect(normalizeSummary(blank), JSON.stringify(blank)).toBe("");
    }
  });

  it("collapses newlines, which Jira rejects outright", () => {
    expect(normalizeSummary("Responsive Auto\nfollow-up")).toBe("Responsive Auto follow-up");
    expect(normalizeSummary("a\n\n\nb")).toBe("a b");
    expect(normalizeSummary("  padded  ")).toBe("padded");
  });

  it("truncates past Jira's 255-character summary limit", () => {
    const long = normalizeSummary("x".repeat(400));
    expect(long.length).toBe(255);
    expect(long.endsWith("…")).toBe(true);
    expect(normalizeSummary("x".repeat(255)).length).toBe(255);
    expect(normalizeSummary("x".repeat(255)).endsWith("…")).toBe(false);
  });
});

describe("buildDescription produces valid ADF", () => {
  it("for a fully populated form", () => {
    expect(invalidNodes(buildDescription({ ...DEMO_DATA, impact: "High" }))).toEqual([]);
  });

  // Pins the happy path: every assertion above is satisfied by a builder that
  // emits nothing at all, so without this a regression in pushBulletSection
  // would silently drop these sections from every ticket and stay green.
  it("still emits the bullet sections and their content for a real form", () => {
    const doc = buildDescription({ ...DEMO_DATA, impact: "High" });
    const json = JSON.stringify(doc);
    for (const heading of ["Functional Requirements", "Risks", "Go to Market"]) {
      expect(json, `missing heading: ${heading}`).toContain(heading);
    }
    const bullets = bulletTexts(doc);
    expect(bullets.length).toBe(
      [DEMO_DATA.functionalRequirements, DEMO_DATA.risks, DEMO_DATA.goToMarket]
        .flatMap((f) => f.split("\n"))
        .filter((l) => l.replace(/^\s*-\s*/, "").trim()).length
    );
    expect(bullets).toContain("Provider location updates every 60 seconds on a customer-facing map");
    expect(bullets.every((b) => !b.startsWith("-"))).toBe(true);
  });

  it("when a bullet field holds only newlines or bare dashes", () => {
    for (const field of BULLET_FIELDS) {
      for (const value of CONTENTLESS) {
        const doc = buildDescription({ ...DEMO_DATA, [field]: value });
        expect(invalidNodes(doc), `${field}=${JSON.stringify(value)}`).toEqual([]);
      }
    }
  });

  it("omits the heading entirely when a bullet field has no content", () => {
    const doc = buildDescription({ ...DEMO_DATA, risks: "\n\n" });
    const headings = JSON.stringify(doc);
    expect(headings).not.toContain("Risks");
  });

  it("for resources missing a description", () => {
    const doc = buildDescription({
      ...DEMO_DATA,
      resources: [
        { id: "1", type: "link", url: "https://example.com/spec", description: "" },
        { id: "2", type: "file", name: "notes.pdf", description: "  " },
      ],
    });
    expect(invalidNodes(doc)).toEqual([]);
    expect(JSON.stringify(doc)).toContain("https://example.com/spec");
    expect(JSON.stringify(doc)).toContain("notes.pdf");
  });

  it("drops resources with no url or filename to reach Jira", () => {
    const doc = buildDescription({
      ...DEMO_DATA,
      resources: [{ id: "1", type: "link", url: "", description: "" }],
    });
    expect(invalidNodes(doc)).toEqual([]);
    expect(JSON.stringify(doc)).not.toContain("Additional Resources");
  });

  it("keeps oversized submissions under the Jira description limit", () => {
    const huge = {
      ...DEMO_DATA,
      additionalBackground: "background ".repeat(4000),
      functionalRequirements: Array.from({ length: 800 }, (_, i) => `- requirement ${i}`).join("\n"),
      risks: "risk ".repeat(3000),
      goToMarket: "gtm ".repeat(3000),
    };
    const doc = buildDescription(huge);
    expect(renderedSize(doc)).toBeLessThan(JIRA_DESCRIPTION_LIMIT);
    // Truncating must not leave an empty container behind — that is the one
    // shape Jira actually rejects.
    expect(invalidNodes(doc)).toEqual([]);
    expect(JSON.stringify(doc)).toContain("truncated");
  });

  it("leaves normal-sized submissions untouched", () => {
    const doc = buildDescription({ ...DEMO_DATA, impact: "High" });
    expect(JSON.stringify(doc)).not.toContain("truncated");
    expect(bulletTexts(doc)).toContain("GPS accuracy degrades in rural or low-signal areas");
  });

  it("for an otherwise empty form with only the required fields", () => {
    const doc = buildDescription({
      ...EMPTY_FORM,
      title: "Test",
      yourName: "Someone",
      timeline: "2026-09-01",
    });
    expect(invalidNodes(doc).filter((n) => n === "empty bulletList")).toEqual([]);
  });
});
