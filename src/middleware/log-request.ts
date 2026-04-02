import type { NextRequest } from "next/server";

export default function logRequest(req: NextRequest) {
  const traceId = req.headers.get("x-amzn-trace-id");
  const userAgent = req.headers.get("user-agent");

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const log = {
    level: "info",
    request_method: req.method,
    request_uri: req.nextUrl.pathname,
    headers,
    ...(traceId ? { "x-amzn-trace-id": traceId } : {}),
    ...(userAgent ? { "user-agent": userAgent } : {}),
  };

  console.log(JSON.stringify(log));
}
