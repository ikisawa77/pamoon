import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { unknownError } from "@/lib/api-response";

export const runtime = "nodejs";

export const POST = async () => {
  try {
    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
