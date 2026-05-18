import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cartCheckoutApiSchema } from "@/lib/schemas";
import { createPaidCartOrders } from "@/lib/workflows/marketplace-workflow";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ", 401);
    }

    if (user.status !== "ACTIVE") {
      return apiError("บัญชีนี้ยังไม่พร้อมสั่งซื้อ", 403);
    }

    const body = await request.json();
    const parsed = cartCheckoutApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await createPaidCartOrders({
      ...parsed.data,
      buyerId: user.id,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
