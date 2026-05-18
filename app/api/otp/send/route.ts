import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { otpSendSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const rateLimitMs = 60 * 1000;
const defaultOtpMinutes = 10;

const createOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนขอรหัส OTP", 401);
    }

    const body = await request.json();
    const parsed = otpSendSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { phone } = parsed.data;
    const latestOtp = await prisma.phoneOtp.findFirst({
      where: { userId: user.id, phone },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (latestOtp && Date.now() - latestOtp.createdAt.getTime() < rateLimitMs) {
      return apiError("กรุณารอ 60 วินาทีก่อนขอรหัส OTP ใหม่", 429);
    }

    const code = createOtpCode();
    const expiresMinutes = Number(process.env.OTP_EXPIRES_MINUTES ?? defaultOtpMinutes);
    const expiresAt = new Date(Date.now() + Math.max(1, expiresMinutes) * 60 * 1000);

    await prisma.phoneOtp.create({
      data: {
        userId: user.id,
        phone,
        codeHash: await hashPassword(code),
        expiresAt,
      },
    });

    const provider = process.env.OTP_PROVIDER ?? "mock";
    const showDevCode = process.env.NODE_ENV !== "production" && process.env.OTP_DEV_CODE_VISIBLE !== "false" && provider === "mock";

    return NextResponse.json({
      ok: true,
      message: "ส่งรหัส OTP แล้ว",
      expiresAt: expiresAt.toISOString(),
      devCode: showDevCode ? code : undefined,
    });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
