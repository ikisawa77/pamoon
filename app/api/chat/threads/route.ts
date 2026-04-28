import { NextResponse } from "next/server";
import { apiError, unknownError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนดูแชท", 401);
    }

    const shopId = user.shops[0]?.id;
    const threads = await prisma.chatThread.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ buyerId: user.id }, ...(shopId ? [{ sellerShopId: shopId }] : [])],
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      include: {
        buyer: { select: { id: true, displayName: true } },
        sellerShop: { select: { id: true, name: true, ownerId: true } },
        product: { select: { title: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, displayName: true } } },
        },
        _count: {
          select: {
            messages: {
              where: {
                readAt: null,
                senderId: { not: user.id },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, threads });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
