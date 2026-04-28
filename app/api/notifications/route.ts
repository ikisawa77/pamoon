import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { prisma } from "@/lib/db/prisma";
import { notificationQuerySchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: true, notifications: [], unreadCount: 0 });
    }

    const parsed = notificationQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? "all",
      category: request.nextUrl.searchParams.get("category") ?? "all",
      limit: request.nextUrl.searchParams.get("limit") ?? 50,
    });

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const status = parsed.data.status ?? "all";
    const category = parsed.data.category ?? "all";
    const categoryTypes = {
      all: undefined,
      orders: ["ORDER_CREATED", "ORDER_PAID", "ORDER_SHIPPED", "SHIPPING_DUE", "SHIPPING_EXTENDED", "SHIPPING_OVERDUE", "REFUND_CREATED"],
      auctions: ["BID_PLACED", "BID_OUTBID", "BID_WINNING", "AUCTION_WON", "PAYMENT_DUE", "PAYMENT_OVERDUE"],
      chat: ["CHAT_MESSAGE", "SHOP_MESSAGE"],
      system: ["SYSTEM", "ACCOUNT_SUSPENDED"],
      action: ["PAYMENT_DUE", "PAYMENT_OVERDUE", "SHIPPING_DUE", "SHIPPING_OVERDUE", "REFUND_CREATED", "ACCOUNT_SUSPENDED"],
    } as const;
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          recipientId: user.id,
          ...(status === "unread" ? { readAt: null } : {}),
          ...(categoryTypes[category] ? { type: { in: [...categoryTypes[category]] } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: parsed.data.limit ?? 50,
        include: {
          actor: {
            select: {
              displayName: true,
              role: true,
            },
          },
          product: {
            select: {
              title: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: {
          recipientId: user.id,
          readAt: null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

export const PATCH = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนอ่านแจ้งเตือน", 401);
    }

    await prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
