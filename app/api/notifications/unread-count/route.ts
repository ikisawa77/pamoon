import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { unknownError } from "@/lib/api-response";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: true, unreadCount: 0 });
    }

    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: user.id,
        readAt: null,
      },
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
