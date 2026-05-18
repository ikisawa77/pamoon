import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      return apiError("อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          role: "MEMBER",
          status: "ACTIVE",
          walletBalanceCents: 0,
          bidLimitCents: 100000,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
      });

      await transaction.notification.create({
        data: {
          recipientId: createdUser.id,
          type: "SYSTEM",
          title: "สมัครสมาชิกสำเร็จ",
          message: "บัญชีสมาชิกพร้อมใช้งานสำหรับซื้อสินค้า เข้าร่วมประมูล เติมเงิน และสมัครเปิดร้านค้าเพิ่มเติมภายหลัง",
          href: "/account",
        },
      });

      return createdUser;
    });

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setSessionCookie(token);

    return NextResponse.json(
      {
        ok: true,
        user,
        nextUrl: "/account",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return unknownError(error);
  }
};
