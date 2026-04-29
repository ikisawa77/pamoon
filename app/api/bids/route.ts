import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { renderEmailTemplate } from "@/lib/email/templates";
import { createBidApiSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const ANTI_SNIPE_WINDOW_MS = 15 * 1000;
const ANTI_SNIPE_EXTENSION_MS = 15 * 1000;

const money = (amountCents: number) => Math.round(amountCents / 100).toLocaleString("th-TH");

export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getCurrentUser();

    if (!sessionUser) {
      return apiError("กรุณาเข้าสู่ระบบก่อนเสนอราคา", 401);
    }

    if (sessionUser.status !== "ACTIVE") {
      return apiError("บัญชีนี้ยังไม่พร้อมเสนอราคา", 403);
    }

    const body = await request.json();
    const parsed = createBidApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        include: {
          sellerShop: {
            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                },
              },
            },
          },
          bids: {
            where: { status: "WINNING" },
            orderBy: { amountCents: "desc" },
            include: {
              bidder: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
      const bidder = await tx.user.findUnique({ where: { id: sessionUser.id } });

      if (!product || product.mode !== "AUCTION" || product.status !== "ACTIVE") {
        throw new Error("สินค้านี้ไม่พร้อมรับการประมูล");
      }

      if (!product.auctionEndsAt || product.auctionEndsAt <= now) {
        throw new Error("รายการประมูลนี้หมดเวลาแล้ว");
      }

      if (!bidder || bidder.status !== "ACTIVE") {
        throw new Error("บัญชีผู้เสนอราคายังไม่พร้อมใช้งาน");
      }

      if (input.amountCents < product.nextBidCents) {
        throw new Error("ราคาที่เสนอจะต้องมากกว่าหรือเท่ากับราคาขั้นต่ำถัดไป");
      }

      if (bidder.bidLimitCents < input.amountCents) {
        throw new Error("วงเงินประมูลไม่เพียงพอ");
      }

      const previousWinningBids = product.bids.filter((bid) => bid.bidderId !== bidder.id);
      const previousWinnersToNotify = previousWinningBids.filter((bid) => !bid.outbidNotifiedAt);
      const previousWinnerIds = Array.from(new Set(previousWinnersToNotify.map((bid) => bid.bidderId)));
      const nextAuctionEndsAt =
        product.auctionEndsAt.getTime() - now.getTime() <= ANTI_SNIPE_WINDOW_MS
          ? new Date(now.getTime() + ANTI_SNIPE_EXTENSION_MS)
          : product.auctionEndsAt;
      const auctionExtended = nextAuctionEndsAt.getTime() !== product.auctionEndsAt.getTime();

      await tx.bid.updateMany({
        where: { productId: product.id, status: { in: ["ACTIVE", "WINNING"] } },
        data: { status: "OUTBID", outbidNotifiedAt: now },
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
          auctionEndsAt: nextAuctionEndsAt,
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
          href: `/auctions/${updatedProduct.id}`,
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
          message: `${bidder.displayName} เสนอราคา ${money(input.amountCents)} บาท สำหรับ ${updatedProduct.title}`,
          href: `/auctions/${updatedProduct.id}`,
          productId: updatedProduct.id,
          bidId: bid.id,
        },
      });

      if (previousWinnerIds.length > 0) {
        const outbidEmails = await Promise.all(
          previousWinnersToNotify.map(async (previousBid) => {
            const rendered = await renderEmailTemplate(
              "BID_OUTBID",
              {
                recipientName: previousBid.bidder.displayName,
                productTitle: updatedProduct.title,
                productHref: `/auctions/${updatedProduct.id}`,
                currentPrice: `${money(input.amountCents)} บาท`,
                timeLeft: updatedProduct.auctionEndsAt?.toLocaleString("th-TH") ?? "รอประกาศ",
                sellerName: product.sellerShop.name,
              },
              tx,
            );

            return {
              recipientId: previousBid.bidder.id,
              toEmail: previousBid.bidder.email,
              subject: rendered.subject,
              body: rendered.html,
              status: "PENDING" as const,
            };
          }),
        );

        await tx.notification.createMany({
          data: previousWinnerIds.map((recipientId) => ({
            recipientId,
            actorId: bidder.id,
            type: "BID_OUTBID" as const,
            title: "มีคนเสนอราคาสูงกว่าคุณ",
            message: `${updatedProduct.title} มีราคาใหม่สูงกว่าราคาของคุณ`,
            href: `/auctions/${updatedProduct.id}`,
            productId: updatedProduct.id,
            bidId: bid.id,
          })),
        });

        await tx.emailNotification.createMany({ data: outbidEmails });
      }

      if (auctionExtended) {
        await tx.notification.createMany({
          data: [
            {
              recipientId: bidder.id,
              actorId: bidder.id,
              type: "SYSTEM" as const,
              title: "ต่อเวลาประมูลอัตโนมัติ",
              message: `${updatedProduct.title} ถูกต่อเวลาอีก 15 วินาที เพราะมีการเสนอราคาในช่วงท้าย`,
              href: `/auctions/${updatedProduct.id}`,
              productId: updatedProduct.id,
              bidId: bid.id,
            },
            {
              recipientId: product.sellerShop.owner.id,
              actorId: bidder.id,
              type: "SYSTEM" as const,
              title: "ต่อเวลาประมูลอัตโนมัติ",
              message: `${updatedProduct.title} ถูกต่อเวลาอีก 15 วินาที`,
              href: `/auctions/${updatedProduct.id}`,
              productId: updatedProduct.id,
              bidId: bid.id,
            },
          ],
        });
      }

      return { bid, product: updatedProduct };
    });

    return NextResponse.json(
      {
        ok: true,
        bid: result.bid,
        product: {
          id: result.product.id,
          currentPriceCents: result.product.currentPriceCents,
          nextBidCents: result.product.nextBidCents,
          auctionEndsAt: result.product.auctionEndsAt?.toISOString() ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }

    return unknownError(error);
  }
};
