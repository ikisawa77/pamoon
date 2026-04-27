import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { unknownError } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const user = await getCurrentUser();

    return NextResponse.json({ ok: true, user });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
