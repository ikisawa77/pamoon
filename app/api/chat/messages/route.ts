import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { chatMessageSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนดูข้อความ", 401);
    }

    const threadId = request.nextUrl.searchParams.get("threadId");

    if (!threadId) {
      return apiError("ไม่พบห้องแชท", 400);
    }

    const shopId = user.shops[0]?.id;
    const thread = await prisma.chatThread.findFirst({
      where: {
        id: threadId,
        status: "ACTIVE",
        OR: [{ buyerId: user.id }, ...(shopId ? [{ sellerShopId: shopId }] : [])],
      },
    });

    if (!thread) {
      return apiError("ไม่มีสิทธิ์อ่านข้อความห้องนี้", 403);
    }

    await prisma.chatMessage.updateMany({
      where: { threadId, senderId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, displayName: true, role: true } } },
    });

    return NextResponse.json({ ok: true, messages });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนส่งข้อความ", 401);
    }

    const body = await request.json();
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await prisma.$transaction(async (tx) => {
      const shopId = user.shops[0]?.id;
      const thread = await tx.chatThread.findFirst({
        where: {
          id: parsed.data.threadId,
          status: "ACTIVE",
          OR: [{ buyerId: user.id }, ...(shopId ? [{ sellerShopId: shopId }] : [])],
        },
        include: {
          buyer: { select: { id: true, displayName: true } },
          sellerShop: { select: { id: true, name: true, ownerId: true } },
          product: { select: { id: true, title: true } },
        },
      });

      if (!thread) {
        throw new Error("ไม่มีสิทธิ์ส่งข้อความในห้องนี้");
      }

      const recipientId = user.id === thread.buyerId ? thread.sellerShop.ownerId : thread.buyerId;
      const message = await tx.chatMessage.create({
        data: {
          threadId: thread.id,
          senderId: user.id,
          body: parsed.data.body,
        },
        include: { sender: { select: { id: true, displayName: true, role: true } } },
      });

      await tx.chatThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: message.createdAt, archivedAt: null },
      });

      await tx.notification.create({
        data: {
          recipientId,
          actorId: user.id,
          type: "CHAT_MESSAGE",
          title: "มีข้อความใหม่",
          message: `${user.displayName} ส่งข้อความเกี่ยวกับ ${thread.product.title}`,
          href: "/account/chat",
          productId: thread.product.id,
          orderId: thread.orderId,
        },
      });

      return message;
    });

    return NextResponse.json({ ok: true, message: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
