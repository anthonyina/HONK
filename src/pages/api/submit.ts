import type { NextApiRequest, NextApiResponse } from "next";
import type { IntakeFormData } from "@/app/lib/intake-types";
import { buildDescription } from "@/app/lib/jira-adf";

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
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

  const impactToRating: Record<string, number> = {
    "Very Low": 1,
    "Low": 2,
    "Medium": 3,
    "High": 4,
    "Very High": 5,
  };

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary: data.title,
    issuetype: { name: "Idea" },
    description: buildDescription(data),
    customfield_10075: data.shortDescription || undefined,
    customfield_10071: data.timeline || undefined,
    customfield_10054: data.impact ? impactToRating[data.impact] : undefined,
  };

  if (data.submitterAccountId) {
    fields.reporter = { accountId: data.submitterAccountId };
  }

  if (data.clientName) {
    // Only send to Jira if it's a valid option — free-text values cause 400 errors
    const { HONK_CLIENTS } = await import("@/app/lib/intake-types");
    if ((HONK_CLIENTS as readonly string[]).includes(data.clientName)) {
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
