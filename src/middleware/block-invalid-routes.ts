import { NextRequest, NextResponse } from "next/server";

export default function blockInvalidRoutes(req: NextRequest) {
  const url = req.nextUrl.pathname;

  const blockPatterns = [/\.php(?:\W|$)/, /\.cgi(?:\W|$)/, /\.pl(?:\W|$)/];

  if (blockPatterns.some((pattern) => pattern.test(url))) {
    const contentType = req.headers.get("content-type");
    const ip =
      req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip");
    const traceId = req.headers.get("x-amzn-trace-id");
    const userAgent = req.headers.get("user-agent");

    const log = {
      level: "warn",
      method: req.method,
      msg: "Blocked request to invalid route",
      path: req.nextUrl.pathname + req.nextUrl.search,
      status: 404,
      ...(contentType ? { "content-type": contentType } : {}),
      ...(ip ? { ip } : {}),
      ...(traceId ? { "x-amzn-trace-id": traceId } : {}),
      ...(userAgent ? { "user-agent": userAgent } : {}),
    };

    console.log(JSON.stringify(log));

    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}
