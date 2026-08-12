import type { NextApiRequest, NextApiResponse } from "next";
import type { IntakeFormData } from "@/app/lib/intake-types";
import { buildDescription } from "@/app/lib/jira-adf";

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

// Jira limits, all confirmed against the live API. Exceeding any of them fails
// the whole create with a 400, so normalise here rather than lose the ticket.
const MAX_SUMMARY = 255;
const MAX_SHORT_DESCRIPTION = 255;

/** Jira rejects a summary that is blank, over 255 chars, or contains newlines. */
export function normalizeSummary(title: string): string {
  const collapsed = (title ?? "").replace(/\s+/g, " ").trim();
  return collapsed.length > MAX_SUMMARY
    ? `${collapsed.slice(0, MAX_SUMMARY - 1)}…`
    : collapsed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data = req.body as IntakeFormData;
  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!siteUrl || !projectKey) {
    return res.status(500).json({ error: "Jira environment variables not configured" });
  }

  // Jira requires a summary. Without this the create fails with an opaque
  // "Summary is required." 400 well after the user has left the form behind.
  const summary = normalizeSummary(data.title);
  if (!summary) {
    return res.status(400).json({ error: "Please add a title before submitting." });
  }

  const shortDescription = (data.shortDescription ?? "").trim().slice(0, MAX_SHORT_DESCRIPTION);

  const impactToRating: Record<string, number> = {
    "Very Low": 1,
    "Low": 2,
    "Medium": 3,
    "High": 4,
    "Very High": 5,
  };

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary,
    issuetype: { name: "Idea" },
    description: buildDescription(data),
    customfield_10075: shortDescription || undefined,
    customfield_10071: data.timeline || undefined,
    customfield_10054: data.impact ? impactToRating[data.impact] : undefined,
  };

  if (data.submitterAccountId) {
    fields.reporter = { accountId: data.submitterAccountId };
  }

  if (data.clientName) {
    // Only send to Jira if it's a currently-valid option — anything else causes a
    // 400 "Specify a valid value for HONK account". Validated against live Jira options.
    const { isValidHonkClient } = await import("@/app/lib/honk-clients");
    if (await isValidHonkClient(data.clientName)) {
      fields.customfield_10686 = [{ value: data.clientName }];
    }
  }

  const payload = { fields };

  const jiraRes = await fetch(`https://${siteUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!jiraRes.ok) {
    const error = await jiraRes.text();
    console.error("Jira API error", { status: jiraRes.status, url: `https://${siteUrl}/rest/api/3/issue`, error });
    let detail = "";
    try { detail = JSON.parse(error)?.errors ? JSON.stringify(JSON.parse(error).errors) : error; } catch { detail = error; }
    console.error("Jira API error", { status: jiraRes.status, detail });
    return res.status(500).json({ error: `Jira returned ${jiraRes.status}: ${detail}` });
  }

  const created = await jiraRes.json() as { key: string; id: string };
  return res.status(200).json({ key: created.key, id: created.id, url: `https://${siteUrl}/browse/${created.key}` });
}
