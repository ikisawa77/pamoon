import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { flushPendingEmailNotifications } from "@/lib/email/sender";

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
      return apiError("ไม่มีสิทธิ์ส่งอีเมลแจ้งเตือน", 403);
    }

    const result = await flushPendingEmailNotifications();
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
