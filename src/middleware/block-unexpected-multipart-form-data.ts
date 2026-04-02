import { NextRequest, NextResponse } from "next/server";
import { VALID_MULTIPART_PATH_PREFIXES } from "@/generated/valid-multipart-path-prefixes";

export default function blockUnexpectedMultipartFormData(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.startsWith("multipart/form-data");

  if (!isMultipart || req.method !== "POST") {
    return null;
  }

  const path = req.nextUrl.pathname;
  const isAllowedPath = VALID_MULTIPART_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isAllowedPath) {
    return null;
  }

  const ip =
    req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip");
  const traceId = req.headers.get("x-amzn-trace-id");
  const userAgent = req.headers.get("user-agent");

  const log = {
    level: "warn",
    method: req.method,
    msg: "Blocked unexpected multipart form data",
    path: req.nextUrl.pathname + req.nextUrl.search,
    status: 400,
    ...(contentType ? { "content-type": contentType } : {}),
    ...(ip ? { ip } : {}),
    ...(traceId ? { "x-amzn-trace-id": traceId } : {}),
    ...(userAgent ? { "user-agent": userAgent } : {}),
  };

  console.log(JSON.stringify(log));

  return NextResponse.json(
    { error: "Multipart form data not allowed" },
    { status: 400 },
  );
}
