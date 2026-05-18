import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { otpVerifySchema } from "@/lib/schemas";

export const runtime = "nodejs";

const maxAttempts = 5;

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนยืนยัน OTP", 401);
    }

    const body = await request.json();
    const parsed = otpVerifySchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { phone, code } = parsed.data;
    const otp = await prisma.phoneOtp.findFirst({
      where: {
        userId: user.id,
        phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return apiError("ไม่พบรหัส OTP ที่ยังใช้งานได้ กรุณาขอรหัสใหม่", 400);
    }

    if (otp.attemptCount >= maxAttempts) {
      return apiError("กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่", 400);
    }

    const matched = await verifyPassword(code, otp.codeHash);

    if (!matched) {
      await prisma.phoneOtp.update({
        where: { id: otp.id },
        data: { attemptCount: { increment: 1 } },
      });
      return apiError("รหัส OTP ไม่ถูกต้อง", 400);
    }

    const verifiedAt = new Date();
    await prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { verifiedAt },
    });

    return NextResponse.json({ ok: true, message: "ยืนยันเบอร์โทรศัพท์สำเร็จ", verifiedAt: verifiedAt.toISOString() });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
