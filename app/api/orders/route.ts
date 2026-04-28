import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { createOrderApiSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = createOrderApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        include: {
          sellerShop: {
            include: {
              owner: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
      const buyer = await tx.user.findUnique({ where: { id: input.buyerId } });

      if (!product || product.mode !== "BUY" || product.status !== "ACTIVE") {
        throw new Error("สินค้านี้ไม่พร้อมให้ซื้อ");
      }

      if (!buyer) {
        throw new Error("ไม่พบสมาชิกผู้ซื้อ");
      }

      if (buyer.walletBalanceCents < product.currentPriceCents) {
        throw new Error("ยอดเงินไม่พอสำหรับสั่งซื้อสินค้า");
      }

      const order = await tx.order.create({
        data: {
          productId: product.id,
          buyerId: buyer.id,
          sellerShopId: product.sellerShopId,
          amountCents: product.currentPriceCents,
          status: "PAID",
          shippingName: input.shippingName ?? buyer.displayName,
          shippingAddress: input.shippingAddress ?? "ที่อยู่จัดส่งตัวอย่างจากระบบทดสอบ",
        },
      });

      const updatedBuyer = await tx.user.update({
        where: { id: buyer.id },
        data: {
          walletBalanceCents: { decrement: product.currentPriceCents },
        },
        select: {
          id: true,
          walletBalanceCents: true,
          bidLimitCents: true,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          status: "SOLD",
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: buyer.id,
          type: "PURCHASE",
          status: "COMPLETED",
          amountCents: product.currentPriceCents,
          referenceType: "ORDER",
          referenceId: order.id,
          note: `ชำระคำสั่งซื้อ ${product.title}`,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            recipientId: buyer.id,
            actorId: product.sellerShop.owner.id,
            type: "ORDER_CREATED",
            title: "สั่งซื้อสำเร็จ",
            message: `คุณสั่งซื้อ ${product.title} จาก ${product.sellerShop.name} สำเร็จ`,
            href: "/account/orders",
            productId: product.id,
            orderId: order.id,
          },
          {
            recipientId: product.sellerShop.owner.id,
            actorId: buyer.id,
            type: "ORDER_PAID",
            title: "มีคำสั่งซื้อใหม่",
            message: `${buyer.displayName} ชำระเงินสำหรับ ${product.title} แล้ว`,
            href: "/account/orders",
            productId: product.id,
            orderId: order.id,
          },
        ],
      });

      return { order, product: updatedProduct, user: updatedBuyer };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
