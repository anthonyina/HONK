import { NextRequest, NextResponse } from "next/server";
import "server-only";

export const dynamic = "force-dynamic";

function getAuthHeader() {
  const email = process.env.ATLASSIAN_EMAIL!;
  const token = process.env.ATLASSIAN_API_TOKEN!;
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const key = body.get("key") as string;
  const audio = body.get("audio") as File;

  if (!key || !audio) {
    return NextResponse.json({ error: "Missing key or audio" }, { status: 400 });
  }

  const siteUrl = process.env.ATLASSIAN_SITE_URL;
  const fd = new FormData();
  fd.append("file", audio, audio.name);

  const res = await fetch(`https://${siteUrl}/rest/api/3/issue/${key}/attachments`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "X-Atlassian-Token": "no-check",
    },
    body: fd,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Jira attach error", { status: res.status, error });
    return NextResponse.json({ error: "Failed to attach file" }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
