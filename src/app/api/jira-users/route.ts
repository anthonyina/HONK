import { NextRequest, NextResponse } from "next/server";
import "server-only";

export const dynamic = "force-dynamic";

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

export async function GET(req: NextRequest) {
  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "Jira not configured" }, { status: 500 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const url = `https://${siteUrl}/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Jira user search error", { status: res.status, error });
    return NextResponse.json({ error: "Failed to search users" }, { status: res.status });
  }

  const users = (await res.json()) as { accountId: string; displayName: string; emailAddress?: string; accountType: string; active: boolean }[];

  // Only return active atlassian accounts, deduplicated by accountId
  const seen = new Set<string>();
  const filtered: { accountId: string; displayName: string }[] = [];
  for (const u of users) {
    if (u.active && u.accountType === "atlassian" && !seen.has(u.accountId)) {
      seen.add(u.accountId);
      filtered.push({ accountId: u.accountId, displayName: u.displayName });
    }
  }

  return NextResponse.json(filtered);
}
