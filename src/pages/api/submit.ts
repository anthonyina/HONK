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

  const payload = {
    fields: {
      project: { key: projectKey },
      summary: data.title,
      issuetype: { name: "Idea" },
      description: buildDescription(data),
      customfield_10075: data.shortDescription || undefined,
      customfield_10071: data.timeline || undefined,
    },
  };

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
    return res.status(500).json({ error: `Jira returned ${jiraRes.status} — check ATLASSIAN_SITE_URL (currently: ${siteUrl})`, detail: error });
  }

  const created = await jiraRes.json() as { key: string; id: string };
  return res.status(200).json({ key: created.key, id: created.id, url: `https://${siteUrl}/browse/${created.key}` });
}
