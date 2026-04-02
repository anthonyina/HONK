import { NextRequest, NextResponse } from "next/server";
import logRequest from "@/middleware/log-request";
import blockInvalidRoutes from "@/middleware/block-invalid-routes";
import validateMultipartFormData from "@/middleware/validate-multipart-form-data";
import blockInvalidActions from "@/middleware/block-invalid-actions";
import blockUnexpectedMultipartFormData from "@/middleware/block-unexpected-multipart-form-data";

export async function proxy(req: NextRequest) {
  const invalidActionResponse = blockInvalidActions(req);
  if (invalidActionResponse) return invalidActionResponse;

  const invalidRoutesResponse = blockInvalidRoutes(req);
  if (invalidRoutesResponse) return invalidRoutesResponse;

  const unexpectedMultipartResponse = blockUnexpectedMultipartFormData(req);
  if (unexpectedMultipartResponse) return unexpectedMultipartResponse;

  const invalidMultipartFormDataResponse = await validateMultipartFormData(req);
  if (invalidMultipartFormDataResponse) return invalidMultipartFormDataResponse;

  logRequest(req);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|health|favicon.ico|robots).*)"],
};
