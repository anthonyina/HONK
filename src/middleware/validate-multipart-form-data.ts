import { NextRequest, NextResponse } from "next/server";

export default async function validateMultipartFormData(req: NextRequest) {
  if (
    req.method === "POST" &&
    req.headers.get("content-type")?.startsWith("multipart/form-data")
  ) {
    try {
      await req.formData();
    } catch (error) {
      const contentType = req.headers.get("content-type");
      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip");
      const traceId = req.headers.get("x-amzn-trace-id");
      const userAgent = req.headers.get("user-agent");

      const log = {
        level: "warn",
        method: req.method,
        msg: "Invalid multipart/form-data body",
        path: req.nextUrl.pathname + req.nextUrl.search,
        status: 400,
        ...(contentType ? { "content-type": contentType } : {}),
        ...(ip ? { ip } : {}),
        ...(traceId ? { "x-amzn-trace-id": traceId } : {}),
        ...(userAgent ? { "user-agent": userAgent } : {}),
      };

      console.log(JSON.stringify(log));

      return NextResponse.json(
        { error: "Invalid multipart/form-data body" },
        { status: 400 },
      );
    }
  }
}
