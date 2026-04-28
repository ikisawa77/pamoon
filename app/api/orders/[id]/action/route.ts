import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { orderActionSchema } from "@/lib/schemas";
import { extendOrderShipping, markOrderShipped, payPendingOrder } from "@/lib/workflows/marketplace-workflow";

export const runtime = "nodejs";

interface OrderActionRouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = async (request: NextRequest, context: OrderActionRouteContext) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนจัดการคำสั่งซื้อ", 401);
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = orderActionSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (parsed.data.action === "pay") {
      const order = await payPendingOrder({ orderId: id, userId: user.id });
      return NextResponse.json({ ok: true, order });
    }

    if (parsed.data.action === "extend-shipping") {
      const order = await extendOrderShipping({ orderId: id, userId: user.id });
      return NextResponse.json({ ok: true, order });
    }

    if (!parsed.data.trackingNumber) {
      return apiError("กรุณากรอกเลขพัสดุ", 400);
    }

    const order = await markOrderShipped({
      orderId: id,
      userId: user.id,
      trackingNumber: parsed.data.trackingNumber,
    });
    return NextResponse.json({ ok: true, order });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
