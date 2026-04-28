import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runMarketplaceSlaProcessor } from "@/lib/workflows/marketplace-workflow";

export const runtime = "nodejs";

const isAuthorized = async (request: NextRequest) => {
  const token = request.headers.get("x-job-token");
  const expectedToken = process.env.INTERNAL_JOB_TOKEN;

  if (expectedToken && token === expectedToken) {
    return true;
  }

  const user = await getCurrentUser();
  return user?.role === "ADMIN";
};

export const POST = async (request: NextRequest) => {
  try {
    if (!(await isAuthorized(request))) {
      return apiError("ไม่มีสิทธิ์รัน SLA processor", 403);
    }

    const result = await runMarketplaceSlaProcessor();
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
