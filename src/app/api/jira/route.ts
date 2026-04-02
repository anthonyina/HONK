import { NextRequest, NextResponse } from "next/server";
import "server-only";
import type { IntakeFormData } from "@/app/lib/intake-types";
import { buildDescription } from "@/app/lib/jira-adf";

export const dynamic = "force-dynamic";

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  console.log("[jira] POST handler invoked");
  const data = (await req.json()) as IntakeFormData;

  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!siteUrl || !projectKey) {
    return NextResponse.json(
      { error: "Jira environment variables not configured" },
      { status: 500 },
    );
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
