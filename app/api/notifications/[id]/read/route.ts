import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { apiError, unknownError } from "@/lib/api-response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

interface NotificationReadRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export const PATCH = async (_request: NextRequest, { params }: NotificationReadRouteProps) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนอ่านแจ้งเตือน", 401);
    }

    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        recipientId: user.id,
      },
    });

    if (!notification) {
      return apiError("ไม่พบแจ้งเตือน", 404);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true, notification: updatedNotification });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
