import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { topUpApiSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      return apiError("กรุณาเข้าสู่ระบบก่อนเติมเงิน", 401);
    }

    const body = await request.json();
    const parsed = topUpApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: sessionUser.id } });

      if (!user) {
        throw new Error("ไม่พบสมาชิกที่ต้องการเติมเงิน");
      }

      if (user.status !== "ACTIVE") {
        throw new Error("บัญชีนี้ยังไม่พร้อมเติมเงิน");
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          walletBalanceCents: { increment: input.amountCents },
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          walletBalanceCents: true,
          bidLimitCents: true,
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: "TOP_UP",
          status: "COMPLETED",
          amountCents: input.amountCents,
          referenceType: "MANUAL_TOP_UP",
          note: input.userId !== sessionUser.id ? "เติมเงินบัญชีตนเอง โดยไม่ใช้ userId จาก body" : "เติมเงินตัวอย่างผ่าน API",
        },
      });

      return { user: updatedUser, transaction };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
