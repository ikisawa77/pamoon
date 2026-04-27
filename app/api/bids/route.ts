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
      const product = await tx.product.findUnique({ where: { id: input.productId } });
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

