import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { flushPendingEmailNotifications } from "@/lib/email/sender";
import { runMarketplaceSlaProcessor } from "@/lib/workflows/marketplace-workflow";

export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("product-status"),
    productId: z.string().min(1),
    status: z.enum(["ACTIVE", "REMOVED"]),
  }),
  z.object({
    action: z.literal("user-status"),
    userId: z.string().min(1),
    status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_REVIEW"]),
  }),
  z.object({
    action: z.literal("shop-status"),
    shopId: z.string().min(1),
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]),
  }),
  z.object({
    action: z.literal("resolve-moderation"),
    caseId: z.string().min(1),
  }),
  z.object({
    action: z.literal("mark-refunded"),
    orderId: z.string().min(1),
  }),
  z.object({
    action: z.literal("run-sla"),
  }),
  z.object({
    action: z.literal("flush-email"),
  }),
  z.object({
    action: z.literal("create-card-set"),
    gameName: z.string().trim().min(2).max(120),
    category: z.enum(["OP01", "OP02", "OP03", "OP04", "OP05"]),
    setCode: z.string().trim().min(2).max(40),
    setName: z.string().trim().min(2).max(120),
    label: z.string().trim().min(2).max(160),
    sortOrder: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("update-card-set"),
    setId: z.string().min(1),
    setName: z.string().trim().min(2).max(120),
    label: z.string().trim().min(2).max(160),
    sortOrder: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean(),
  }),
]);

const audit = async (adminId: string, action: string, targetType: string, targetId: string, message: string) =>
  prisma.adminAuditLog.create({
    data: {
      adminId,
      action: action as never,
      targetType,
      targetId,
      message,
    },
  });

export const POST = async (request: NextRequest) => {
  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "ADMIN") {
      return apiError("ไม่มีสิทธิ์จัดการระบบหลังบ้าน", 403);
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;

    if (input.action === "product-status") {
      const product = await prisma.product.update({
        where: { id: input.productId },
        data: { status: input.status },
        select: { id: true, title: true, status: true },
      });
      await audit(admin.id, "PRODUCT_STATUS_CHANGED", "Product", product.id, `เปลี่ยนสถานะสินค้า ${product.title} เป็น ${product.status}`);
      return NextResponse.json({ ok: true, product });
    }

    if (input.action === "user-status") {
      const user = await prisma.user.update({
        where: { id: input.userId },
        data: { status: input.status },
        select: { id: true, email: true, status: true },
      });
      await audit(admin.id, "USER_STATUS_CHANGED", "User", user.id, `เปลี่ยนสถานะสมาชิก ${user.email} เป็น ${user.status}`);
      return NextResponse.json({ ok: true, user });
    }

    if (input.action === "shop-status") {
      const shop = await prisma.shop.update({
        where: { id: input.shopId },
        data: { status: input.status },
        select: { id: true, name: true, status: true },
      });
      await audit(admin.id, "SHOP_STATUS_CHANGED", "Shop", shop.id, `เปลี่ยนสถานะร้าน ${shop.name} เป็น ${shop.status}`);
      return NextResponse.json({ ok: true, shop });
    }

    if (input.action === "resolve-moderation") {
      const moderationCase = await prisma.moderationCase.update({
        where: { id: input.caseId },
        data: { status: "RESOLVED", assignedToId: admin.id, resolvedAt: new Date() },
      });
      await audit(admin.id, "MODERATION_RESOLVED", "ModerationCase", moderationCase.id, "ปิดเคสตรวจสอบแล้ว");
      return NextResponse.json({ ok: true, moderationCase });
    }

    if (input.action === "mark-refunded") {
      const order = await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id: input.orderId },
          include: { buyer: true, product: true },
        });

        if (!currentOrder || currentOrder.status !== "REFUND_PENDING") {
          throw new Error("คำสั่งซื้อนี้ไม่อยู่ในสถานะรอคืนเงิน");
        }

        await tx.user.update({
          where: { id: currentOrder.buyerId },
          data: { walletBalanceCents: { increment: currentOrder.amountCents } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: currentOrder.buyerId,
            type: "REFUND",
            status: "COMPLETED",
            amountCents: currentOrder.amountCents,
            referenceType: "ADMIN_REFUND",
            referenceId: currentOrder.id,
            note: `admin คืนเงิน ${currentOrder.product.title}`,
          },
        });
        await tx.notification.create({
          data: {
            recipientId: currentOrder.buyerId,
            type: "REFUND_CREATED",
            title: "คืนเงินสำเร็จ",
            message: `ผู้ดูแลคืนเงิน ${currentOrder.product.title} เข้ากระเป๋าของคุณแล้ว`,
            href: "/account/orders",
            productId: currentOrder.productId,
            orderId: currentOrder.id,
          },
        });
        return tx.order.update({
          where: { id: currentOrder.id },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
      });
      await audit(admin.id, "REFUND_MARKED", "Order", order.id, "admin ทำรายการคืนเงินแล้ว");
      return NextResponse.json({ ok: true, order });
    }

    if (input.action === "run-sla") {
      const result = await runMarketplaceSlaProcessor();
      await audit(admin.id, "SLA_RUN", "System", "sla", "รัน SLA processor จากหลังบ้าน");
      return NextResponse.json({ ok: true, result });
    }

    if (input.action === "flush-email") {
      const result = await flushPendingEmailNotifications();
      await audit(admin.id, "EMAIL_FLUSH", "System", "email", "ส่งอีเมลค้างส่งจากหลังบ้าน");
      return NextResponse.json({ ok: true, result });
    }

    if (input.action === "create-card-set") {
      const game = await prisma.cardGame.upsert({
        where: { name: input.gameName },
        create: { name: input.gameName, isActive: true },
        update: { isActive: true },
      });
      const cardSet = await prisma.cardSet.create({
        data: {
          gameId: game.id,
          category: input.category,
          setCode: input.setCode,
          setName: input.setName,
          label: input.label,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
      });
      await audit(admin.id, "CARD_SET_UPDATED", "CardSet", cardSet.id, `เพิ่มชุดการ์ด ${cardSet.label}`);
      return NextResponse.json({ ok: true, cardSet }, { status: 201 });
    }

    const cardSet = await prisma.cardSet.update({
      where: { id: input.setId },
      data: {
        setName: input.setName,
        label: input.label,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });
    await audit(admin.id, "CARD_SET_UPDATED", "CardSet", cardSet.id, `แก้ไขชุดการ์ด ${cardSet.label}`);
    return NextResponse.json({ ok: true, cardSet });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
