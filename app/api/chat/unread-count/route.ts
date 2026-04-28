import { NextResponse } from "next/server";
import { unknownError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: true, unreadCount: 0 });
    }

    const shopId = user.shops[0]?.id;
    const threads = await prisma.chatThread.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ buyerId: user.id }, ...(shopId ? [{ sellerShopId: shopId }] : [])],
      },
      select: { id: true },
    });
    const threadIds = threads.map((thread) => thread.id);

    if (threadIds.length === 0) {
      return NextResponse.json({ ok: true, unreadCount: 0 });
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        threadId: { in: threadIds },
        senderId: { not: user.id },
        readAt: null,
      },
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
