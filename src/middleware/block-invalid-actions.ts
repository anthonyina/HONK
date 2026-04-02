import { NextRequest, NextResponse } from "next/server";

const ACTION_ID_REGEX = /^[a-f0-9]{16,64}$/i;

const API_ROUTE_PREFIXES = ["/api/", "/_api/"];

function isApiRoute(pathname: string): boolean {
  return API_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function blockInvalidActions(req: NextRequest) {
  if (req.method !== "POST") {
    return null;
  }

  const nextAction = req.headers.get("next-action");
  const pathname = req.nextUrl.pathname;

  if (nextAction !== null && !ACTION_ID_REGEX.test(nextAction)) {
    return blockWithLog(req, "Blocked POST request with invalid next-action header");
  }

  if (nextAction === null && !isApiRoute(pathname)) {
    return blockWithLog(req, "Blocked POST to page route without next-action header");
  }

  return null;
}

function blockWithLog(req: NextRequest, msg: string) {
  const contentType = req.headers.get("content-type");
  const nextAction = req.headers.get("next-action");
  const ip =
    req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip");
  const traceId = req.headers.get("x-amzn-trace-id");
  const userAgent = req.headers.get("user-agent");

  const log = {
    level: "warn",
    method: req.method,
    msg,
    path: req.nextUrl.pathname + req.nextUrl.search,
    status: 400,
    ...(nextAction ? { nextAction } : {}),
    ...(contentType ? { "content-type": contentType } : {}),
    ...(ip ? { ip } : {}),
    ...(traceId ? { "x-amzn-trace-id": traceId } : {}),
    ...(userAgent ? { "user-agent": userAgent } : {}),
  };

  console.log(JSON.stringify(log));

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
