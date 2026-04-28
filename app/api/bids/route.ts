import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { createBidApiSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = createBidApiSchema.safeParse(body);

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
                },
              },
            },
          },
          bids: {
            where: {
              status: "ACTIVE",
            },
            select: {
              bidderId: true,
            },
          },
        },
      });
      const bidder = await tx.user.findUnique({ where: { id: input.bidderId } });

      if (!product || product.mode !== "AUCTION" || product.status !== "ACTIVE") {
        throw new Error("สินค้านี้ไม่พร้อมรับการประมูล");
      }

      if (!bidder) {
        throw new Error("ไม่พบสมาชิกผู้เสนอราคา");
      }

      if (input.amountCents < product.nextBidCents) {
        throw new Error("ราคาที่เสนอจะต้องมากกว่าหรือเท่ากับราคาขั้นต่ำถัดไป");
      }

      if (bidder.bidLimitCents < input.amountCents) {
        throw new Error("วงเงินประมูลไม่เพียงพอ");
      }

      const previousBidderIds = product.bids
        .map((bidItem) => bidItem.bidderId)
        .filter((bidderId) => bidderId !== bidder.id);

      await tx.bid.updateMany({
        where: { productId: product.id, status: "ACTIVE" },
        data: { status: "OUTBID" },
      });

      const bid = await tx.bid.create({
        data: {
          productId: product.id,
          bidderId: bidder.id,
          amountCents: input.amountCents,
          status: "WINNING",
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          currentPriceCents: input.amountCents,
          nextBidCents: input.amountCents + Math.max(25000, Math.round(input.amountCents * 0.05)),
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId: bidder.id,
          type: "BID_HOLD",
          status: "COMPLETED",
          amountCents: input.amountCents,
          referenceType: "BID",
          referenceId: bid.id,
          note: `กันวงเงินประมูล ${updatedProduct.title}`,
        },
      });

      await tx.notification.create({
        data: {
          recipientId: bidder.id,
          actorId: bidder.id,
          type: "BID_WINNING",
          title: "เสนอราคาสำเร็จ",
          message: `คุณเป็นผู้เสนอราคาสูงสุดของ ${updatedProduct.title}`,
          href: "/account/auctions",
          productId: updatedProduct.id,
          bidId: bid.id,
        },
      });

      await tx.notification.create({
        data: {
          recipientId: product.sellerShop.owner.id,
          actorId: bidder.id,
          type: "BID_PLACED",
          title: "มีผู้เสนอราคาใหม่",
          message: `${bidder.displayName} เสนอราคา ${Math.round(input.amountCents / 100).toLocaleString("th-TH")} บาท สำหรับ ${updatedProduct.title}`,
          href: "/account/auctions",
          productId: updatedProduct.id,
          bidId: bid.id,
        },
      });

      if (previousBidderIds.length > 0) {
        await tx.notification.createMany({
          data: previousBidderIds.map((recipientId) => ({
            recipientId,
            actorId: bidder.id,
            type: "BID_OUTBID" as const,
            title: "มีคนเสนอราคาสูงกว่า",
            message: `${updatedProduct.title} มีราคาใหม่สูงกว่าราคาของคุณ`,
            href: "/account/auctions",
            productId: updatedProduct.id,
            bidId: bid.id,
          })),
        });
      }

      return { bid, product: updatedProduct };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
