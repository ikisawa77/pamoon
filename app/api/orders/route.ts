import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createOrderApiSchema } from "@/lib/schemas";
import { createPaidBuyNowOrder } from "@/lib/workflows/marketplace-workflow";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ", 401);
    }

    const body = await request.json();
    const parsed = createOrderApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (parsed.data.buyerId !== user.id) {
      return apiError("ไม่สามารถสร้างคำสั่งซื้อแทนสมาชิกอื่นได้", 403);
    }

    const result = await createPaidBuyNowOrder(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
