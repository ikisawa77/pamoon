import { prisma } from "@/lib/db/prisma";
import { renderEmailTemplate } from "@/lib/email/templates";

const HOUR_MS = 60 * 60 * 1000;
const PAYMENT_WINDOW_MS = 24 * HOUR_MS;
const SHIPPING_WINDOW_MS = 48 * HOUR_MS;
const SHIPPING_EXTENSION_MS = 24 * HOUR_MS;
const REFUND_WINDOW_MS = 24 * HOUR_MS;
const CHAT_ARCHIVE_MS = 48 * HOUR_MS;
const SHIPPING_EXTENSION_FEE_CENTS = 5000;
const AUCTION_ENDING_SOON_MS = 5 * 60 * 1000;

const addMs = (date: Date, ms: number) => new Date(date.getTime() + ms);

export const marketplaceWorkflowConfig = {
  paymentWindowMs: PAYMENT_WINDOW_MS,
  shippingWindowMs: SHIPPING_WINDOW_MS,
  shippingExtensionMs: SHIPPING_EXTENSION_MS,
  refundWindowMs: REFUND_WINDOW_MS,
  chatArchiveMs: CHAT_ARCHIVE_MS,
  shippingExtensionFeeCents: SHIPPING_EXTENSION_FEE_CENTS,
};

export const createPaidBuyNowOrder = async (input: {
  productId: string;
  buyerId: string;
  shippingName?: string;
  shippingAddress?: string;
}) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      include: {
        sellerShop: {
          include: {
            owner: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    const buyer = await tx.user.findUnique({ where: { id: input.buyerId } });

    if (!product || product.mode !== "BUY" || product.status !== "ACTIVE") {
      throw new Error("สินค้านี้ไม่พร้อมให้ซื้อ");
    }

    if (!buyer || buyer.status !== "ACTIVE") {
      throw new Error("บัญชีผู้ซื้อไม่พร้อมใช้งาน");
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
        source: "BUY_NOW",
        paidAt: now,
        shipDueAt: addMs(now, SHIPPING_WINDOW_MS),
        shippingName: input.shippingName ?? buyer.displayName,
        shippingAddress: input.shippingAddress ?? "ที่อยู่จัดส่งตัวอย่างจากระบบทดสอบ",
      },
    });

    const updatedBuyer = await tx.user.update({
      where: { id: buyer.id },
      data: { walletBalanceCents: { decrement: product.currentPriceCents } },
      select: { id: true, walletBalanceCents: true, bidLimitCents: true },
    });

    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { status: "SOLD" },
    });

    await tx.walletTransaction.create({
      data: {
        userId: buyer.id,
        type: "PURCHASE",
        status: "COMPLETED",
        amountCents: product.currentPriceCents,
        referenceType: "ORDER_ESCROW",
        referenceId: order.id,
        note: `กันเงินไว้ใน escrow สำหรับ ${product.title}`,
      },
    });

    await tx.chatThread.create({
      data: {
        orderId: order.id,
        buyerId: buyer.id,
        sellerShopId: product.sellerShopId,
        productId: product.id,
        lastMessageAt: now,
      },
    });

    await tx.notification.createMany({
      data: [
        {
          recipientId: buyer.id,
          actorId: product.sellerShop.owner.id,
          type: "ORDER_PAID",
          title: "ชำระเงินสำเร็จ",
          message: `ระบบกันเงินสำหรับ ${product.title} ไว้ใน escrow แล้ว ร้านค้าต้องจัดส่งภายใน 48 ชม.`,
          href: "/account/orders",
          productId: product.id,
          orderId: order.id,
        },
        {
          recipientId: product.sellerShop.owner.id,
          actorId: buyer.id,
          type: "SHIPPING_DUE",
          title: "มีคำสั่งซื้อที่ต้องจัดส่ง",
          message: `${buyer.displayName} ชำระเงิน ${product.title} แล้ว กรุณาจัดส่งภายใน 48 ชม.`,
          href: "/account/orders",
          productId: product.id,
          orderId: order.id,
        },
      ],
    });

    return { order, product: updatedProduct, user: updatedBuyer };
  });

export const payPendingOrder = async (input: { orderId: string; userId: string }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        buyer: true,
        product: true,
        sellerShop: { include: { owner: { select: { id: true, displayName: true } } } },
      },
    });

    if (!order || order.buyerId !== input.userId || order.status !== "PENDING_PAYMENT") {
      throw new Error("ไม่พบคำสั่งซื้อที่รอชำระเงิน");
    }

    if (order.paymentDueAt && order.paymentDueAt < now) {
      throw new Error("คำสั่งซื้อนี้หมดเวลาชำระเงินแล้ว");
    }

    if (order.buyer.walletBalanceCents < order.amountCents) {
      throw new Error("ยอดเงินไม่พอสำหรับชำระเงิน");
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: now, shipDueAt: addMs(now, SHIPPING_WINDOW_MS) },
    });

    await tx.user.update({
      where: { id: order.buyerId },
      data: { walletBalanceCents: { decrement: order.amountCents } },
    });

    await tx.walletTransaction.create({
      data: {
        userId: order.buyerId,
        type: "PURCHASE",
        status: "COMPLETED",
        amountCents: order.amountCents,
        referenceType: "ORDER_ESCROW",
        referenceId: order.id,
        note: `กันเงินไว้ใน escrow สำหรับ ${order.product.title}`,
      },
    });

    await tx.chatThread.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        buyerId: order.buyerId,
        sellerShopId: order.sellerShopId,
        productId: order.productId,
        lastMessageAt: now,
      },
      update: { status: "ACTIVE", archivedAt: null, lastMessageAt: now },
    });

    await tx.notification.createMany({
      data: [
        {
          recipientId: order.buyerId,
          actorId: order.sellerShop.owner.id,
          type: "ORDER_PAID",
          title: "ชำระเงินประมูลสำเร็จ",
          message: `คุณชำระเงิน ${order.product.title} แล้ว ร้านค้าต้องจัดส่งภายใน 48 ชม.`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
        {
          recipientId: order.sellerShop.owner.id,
          actorId: order.buyerId,
          type: "SHIPPING_DUE",
          title: "ผู้ชนะประมูลชำระเงินแล้ว",
          message: `${order.buyer.displayName} ชำระเงิน ${order.product.title} แล้ว กรุณาจัดส่งภายใน 48 ชม.`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
      ],
    });

    return updatedOrder;
  });

export const extendOrderShipping = async (input: { orderId: string; userId: string }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        buyer: { select: { id: true, displayName: true } },
        product: true,
        sellerShop: { include: { owner: true } },
      },
    });

    if (!order || order.sellerShop.ownerId !== input.userId || order.status !== "PAID" || !order.shipDueAt) {
      throw new Error("ไม่พบคำสั่งซื้อที่ขยายเวลาส่งได้");
    }

    if (order.shippingExtensionCount >= 1) {
      throw new Error("คำสั่งซื้อนี้ขยายเวลาจัดส่งครบ 1 ครั้งแล้ว");
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        shipDueAt: addMs(order.shipDueAt, SHIPPING_EXTENSION_MS),
        shippingExtendedAt: now,
        shippingExtensionCount: { increment: 1 },
      },
    });

    await tx.user.update({
      where: { id: order.buyerId },
      data: { walletBalanceCents: { increment: SHIPPING_EXTENSION_FEE_CENTS } },
    });

    await tx.walletTransaction.create({
      data: {
        userId: order.buyerId,
        type: "REFUND",
        status: "COMPLETED",
        amountCents: SHIPPING_EXTENSION_FEE_CENTS,
        referenceType: "SHIPPING_EXTENSION",
        referenceId: order.id,
        note: `ชดเชยขยายเวลาจัดส่ง ${order.product.title}`,
      },
    });

    await tx.notification.createMany({
      data: [
        {
          recipientId: order.buyerId,
          actorId: order.sellerShop.ownerId,
          type: "SHIPPING_EXTENDED",
          title: "ร้านค้าขยายเวลาจัดส่ง",
          message: `${order.sellerShop.name} ขยายเวลาจัดส่ง ${order.product.title} อีก 24 ชม. และชดเชย 50 บาทให้คุณ`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
        {
          recipientId: order.sellerShop.ownerId,
          actorId: order.buyerId,
          type: "SHIPPING_EXTENDED",
          title: "ขยายเวลาจัดส่งสำเร็จ",
          message: `ระบบขยายเวลาจัดส่ง ${order.product.title} อีก 24 ชม. และชดเชยผู้ซื้อ 50 บาท`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
      ],
    });

    return updatedOrder;
  });

export const markOrderShipped = async (input: { orderId: string; userId: string; trackingNumber: string }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        product: true,
        buyer: { select: { id: true, displayName: true } },
        sellerShop: { include: { owner: true } },
      },
    });

    if (!order || order.sellerShop.ownerId !== input.userId || order.status !== "PAID") {
      throw new Error("ไม่พบคำสั่งซื้อที่จัดส่งได้");
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: "SHIPPED", shippedAt: now, trackingNumber: input.trackingNumber },
    });

    await tx.notification.createMany({
      data: [
        {
          recipientId: order.buyerId,
          actorId: order.sellerShop.ownerId,
          type: "ORDER_SHIPPED",
          title: "ร้านค้าจัดส่งสินค้าแล้ว",
          message: `${order.sellerShop.name} จัดส่ง ${order.product.title} แล้ว เลขพัสดุ ${input.trackingNumber}`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
        {
          recipientId: order.sellerShop.ownerId,
          actorId: order.buyerId,
          type: "ORDER_SHIPPED",
          title: "บันทึกการจัดส่งแล้ว",
          message: `ระบบบันทึกเลขพัสดุ ${input.trackingNumber} สำหรับ ${order.product.title}`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
      ],
    });

    return updatedOrder;
  });

export const runMarketplaceSlaProcessor = async (now = new Date()) => {
  const result = {
    auctionsClosed: 0,
    paymentExpired: 0,
    shippingOverdue: 0,
    refundsCompleted: 0,
    chatsArchived: 0,
    favoriteEndingSoon: 0,
    favoriteNotificationsDisabled: 0,
  };

  await prisma.$transaction(async (tx) => {
    const endingSoonFavoriteProducts = await tx.product.findMany({
      where: {
        mode: "AUCTION",
        status: "ACTIVE",
        auctionEndsAt: {
          gt: now,
          lte: addMs(now, AUCTION_ENDING_SOON_MS),
        },
      },
      include: {
        favorites: {
          where: {
            emailNotify: true,
            notifyEndingSoon: true,
            endingSoonNotifiedAt: null,
            disabledAfterAuctionAt: null,
          },
          include: {
            user: { select: { id: true, email: true } },
          },
        },
        bids: {
          where: {
            status: { in: ["WINNING", "OUTBID"] },
            endingSoonNotifiedAt: null,
          },
          include: {
            bidder: { select: { id: true, email: true } },
          },
        },
      },
      take: 50,
    });

    for (const product of endingSoonFavoriteProducts) {
      const favoriteRecipients = product.favorites.map((favorite) => favorite.user);
      const bidRecipients = product.bids.map((bid) => bid.bidder);
      const recipientMap = new Map([...favoriteRecipients, ...bidRecipients].map((recipient) => [recipient.id, recipient]));
      const recipients = Array.from(recipientMap.values());

      if (recipients.length === 0) {
        continue;
      }

      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          recipientId: recipient.id,
          type: "SYSTEM" as const,
          title: "ประมูลเหลือ 5 นาทีสุดท้าย",
          message: `${product.title} จะปิดประมูลในอีกไม่กี่นาที`,
          href: `/auctions/${product.id}`,
          productId: product.id,
        })),
      });

      await tx.emailNotification.createMany({
        data: recipients.map((recipient) => ({
          recipientId: recipient.id,
          toEmail: recipient.email,
          subject: `ประมูลใกล้จบ: ${product.title}`,
          body: `${product.title} เหลือเวลาประมูลประมาณ 5 นาที`,
          status: "PENDING" as const,
        })),
      });

      if (favoriteRecipients.length > 0) {
        await tx.favoriteProduct.updateMany({
          where: {
            productId: product.id,
            userId: { in: favoriteRecipients.map((recipient) => recipient.id) },
          },
          data: { endingSoonNotifiedAt: now },
        });
      }

      if (bidRecipients.length > 0) {
        await tx.bid.updateMany({
          where: {
            productId: product.id,
            bidderId: { in: bidRecipients.map((recipient) => recipient.id) },
          },
          data: { endingSoonNotifiedAt: now },
        });
      }

      result.favoriteEndingSoon += recipients.length;
    }

    const endingSoonProducts = await tx.product.findMany({
      where: {
        mode: "AUCTION",
        status: "ACTIVE",
        auctionEndsAt: {
          gt: now,
          lte: addMs(now, AUCTION_ENDING_SOON_MS),
        },
      },
      include: {
        favorites: {
          where: {
            emailNotify: true,
            notifyEndingSoon: true,
            endingSoonNotifiedAt: null,
            disabledAfterAuctionAt: null,
          },
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
      take: 50,
    });

    for (const product of endingSoonProducts) {
      const favoriteRecipients = product.favorites.map((favorite) => favorite.user);

      if (favoriteRecipients.length === 0) {
        continue;
      }

      await tx.notification.createMany({
        data: favoriteRecipients.map((recipient) => ({
          recipientId: recipient.id,
          type: "SYSTEM" as const,
          title: "ประมูลในรายการโปรดเหลือ 5 นาที",
          message: `${product.title} จะปิดประมูลในอีกไม่กี่นาที`,
          href: "/collection",
          productId: product.id,
        })),
      });

      await tx.emailNotification.createMany({
        data: favoriteRecipients.map((recipient) => ({
          recipientId: recipient.id,
          toEmail: recipient.email,
          subject: `ประมูลใกล้จบ: ${product.title}`,
          body: `${product.title} ในรายการโปรดของคุณเหลือเวลาประมูลประมาณ 5 นาที`,
          status: "PENDING" as const,
        })),
      });

      await tx.favoriteProduct.updateMany({
        where: {
          productId: product.id,
          userId: { in: favoriteRecipients.map((recipient) => recipient.id) },
        },
        data: { endingSoonNotifiedAt: now },
      });
      result.favoriteEndingSoon += favoriteRecipients.length;
    }

    const endedAuctions = await tx.product.findMany({
      where: { mode: "AUCTION", status: "ACTIVE", auctionEndsAt: { lte: now } },
      include: {
        sellerShop: { include: { owner: { select: { id: true, displayName: true } } } },
        bids: { where: { status: "WINNING" }, orderBy: { amountCents: "desc" }, take: 1, include: { bidder: true } },
      },
      take: 50,
    });

    for (const product of endedAuctions) {
      const winningBid = product.bids[0];
      await tx.product.update({ where: { id: product.id }, data: { status: "ENDED" } });
      result.auctionsClosed += 1;

      if (!winningBid) {
        continue;
      }

      const order = await tx.order.create({
        data: {
          productId: product.id,
          buyerId: winningBid.bidderId,
          sellerShopId: product.sellerShopId,
          amountCents: winningBid.amountCents,
          status: "PENDING_PAYMENT",
          source: "AUCTION",
          paymentDueAt: addMs(now, PAYMENT_WINDOW_MS),
          shippingName: winningBid.bidder.displayName,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            recipientId: winningBid.bidderId,
            actorId: product.sellerShop.owner.id,
            type: "AUCTION_WON",
            title: "คุณชนะประมูล",
            message: `คุณชนะประมูล ${product.title} กรุณาชำระเงินภายใน 24 ชม.`,
            href: "/account/auctions",
            productId: product.id,
            orderId: order.id,
            bidId: winningBid.id,
          },
          {
            recipientId: winningBid.bidderId,
            actorId: product.sellerShop.owner.id,
            type: "PAYMENT_DUE",
            title: "รอชำระเงินประมูล",
            message: `${product.title} ต้องชำระเงินภายใน ${order.paymentDueAt?.toLocaleString("th-TH")}`,
            href: "/account/orders",
            productId: product.id,
            orderId: order.id,
            bidId: winningBid.id,
          },
          {
            recipientId: product.sellerShop.owner.id,
            actorId: winningBid.bidderId,
            type: "AUCTION_WON",
            title: "ประมูลจบแล้ว",
            message: `${winningBid.bidder.displayName} ชนะประมูล ${product.title} ระบบกำลังรอชำระเงิน`,
            href: "/account/orders",
            productId: product.id,
            orderId: order.id,
            bidId: winningBid.id,
          },
        ],
      });

      const auctionWonEmail = await renderEmailTemplate(
        "AUCTION_WON",
        {
          recipientName: winningBid.bidder.displayName,
          productTitle: product.title,
          productHref: "/account/orders",
          currentPrice: `${Math.round(winningBid.amountCents / 100).toLocaleString("th-TH")} บาท`,
          totalPrice: `${Math.round(winningBid.amountCents / 100).toLocaleString("th-TH")} บาท`,
          paymentDue: order.paymentDueAt?.toLocaleString("th-TH") ?? "24 ชั่วโมง",
          timeLeft: "24 ชั่วโมง",
          sellerName: product.sellerShop.name,
        },
        tx,
      );
      const paymentDueEmail = await renderEmailTemplate(
        "PAYMENT_DUE",
        {
          recipientName: winningBid.bidder.displayName,
          productTitle: product.title,
          productHref: "/account/orders",
          currentPrice: `${Math.round(winningBid.amountCents / 100).toLocaleString("th-TH")} บาท`,
          totalPrice: `${Math.round(winningBid.amountCents / 100).toLocaleString("th-TH")} บาท`,
          paymentDue: order.paymentDueAt?.toLocaleString("th-TH") ?? "24 ชั่วโมง",
          timeLeft: "24 ชั่วโมง",
          sellerName: product.sellerShop.name,
        },
        tx,
      );

      await tx.emailNotification.createMany({
        data: [
          {
            recipientId: winningBid.bidderId,
            toEmail: winningBid.bidder.email,
            subject: auctionWonEmail.subject,
            body: auctionWonEmail.html,
            status: "PENDING" as const,
          },
          {
            recipientId: winningBid.bidderId,
            toEmail: winningBid.bidder.email,
            subject: paymentDueEmail.subject,
            body: paymentDueEmail.html,
            status: "PENDING" as const,
          },
        ],
      });
    }

    const expiredPayments = await tx.order.findMany({
      where: { status: "PENDING_PAYMENT", paymentDueAt: { lte: now } },
      include: { buyer: true, product: true, sellerShop: { include: { owner: true } } },
      take: 50,
    });

    for (const order of expiredPayments) {
      await tx.order.update({ where: { id: order.id }, data: { status: "PAYMENT_EXPIRED", cancelledAt: now } });
      await tx.user.update({ where: { id: order.buyerId }, data: { status: "SUSPENDED" } });
      await tx.moderationCase.create({
        data: {
          type: "BUYER_PAYMENT_OVERDUE",
          userId: order.buyerId,
          orderId: order.id,
          reason: `ผู้ซื้อไม่ชำระเงิน ${order.product.title} ภายใน 24 ชม.หลังชนะประมูล`,
        },
      });
      await tx.notification.createMany({
        data: [
          {
            recipientId: order.buyerId,
            actorId: order.sellerShop.ownerId,
            type: "PAYMENT_OVERDUE",
            title: "หมดเวลาชำระเงิน",
            message: `คุณไม่ชำระเงิน ${order.product.title} ภายใน 24 ชม. ระบบระงับบัญชีเพื่อให้แอดมินตรวจสอบ`,
            href: "/account/orders",
            productId: order.productId,
            orderId: order.id,
          },
          {
            recipientId: order.sellerShop.ownerId,
            actorId: order.buyerId,
            type: "PAYMENT_OVERDUE",
            title: "ผู้ชนะประมูลไม่ชำระเงิน",
            message: `${order.buyer.displayName} ไม่ชำระเงิน ${order.product.title} ภายในเวลา`,
            href: "/account/orders",
            productId: order.productId,
            orderId: order.id,
          },
        ],
      });
      result.paymentExpired += 1;
    }

    const overdueShipments = await tx.order.findMany({
      where: { status: "PAID", shipDueAt: { lte: now } },
      include: { buyer: true, product: true, sellerShop: { include: { owner: true } } },
      take: 50,
    });

    for (const order of overdueShipments) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUND_PENDING", refundDueAt: addMs(now, REFUND_WINDOW_MS) },
      });
      await tx.shop.update({ where: { id: order.sellerShopId }, data: { status: "SUSPENDED" } });
      await tx.user.update({ where: { id: order.sellerShop.ownerId }, data: { status: "SUSPENDED" } });
      await tx.product.updateMany({ where: { sellerShopId: order.sellerShopId, status: "ACTIVE" }, data: { status: "REMOVED" } });
      await tx.moderationCase.create({
        data: {
          type: "SELLER_SHIPPING_OVERDUE",
          userId: order.sellerShop.ownerId,
          shopId: order.sellerShopId,
          orderId: order.id,
          reason: `ร้านค้าไม่จัดส่ง ${order.product.title} ภายใน SLA`,
        },
      });
      await tx.notification.createMany({
        data: [
          {
            recipientId: order.buyerId,
            actorId: order.sellerShop.ownerId,
            type: "SHIPPING_OVERDUE",
            title: "ร้านค้าเลยกำหนดจัดส่ง",
            message: `${order.sellerShop.name} ไม่จัดส่ง ${order.product.title} ภายในเวลา ระบบกำลังคืนเงินให้คุณ`,
            href: "/account/orders",
            productId: order.productId,
            orderId: order.id,
          },
          {
            recipientId: order.sellerShop.ownerId,
            actorId: order.buyerId,
            type: "ACCOUNT_SUSPENDED",
            title: "ร้านค้าถูกระงับเพื่อตรวจสอบ",
            message: `ระบบระงับร้าน ${order.sellerShop.name} เพราะไม่จัดส่ง ${order.product.title} ภายใน SLA`,
            href: "/account/orders",
            productId: order.productId,
            orderId: order.id,
          },
        ],
      });
      result.shippingOverdue += 1;
    }

    const pendingRefunds = await tx.order.findMany({
      where: { status: "REFUND_PENDING", refundDueAt: { lte: now }, refundedAt: null },
      include: { buyer: true, product: true, sellerShop: true },
      take: 50,
    });

    for (const order of pendingRefunds) {
      await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED", refundedAt: now } });
      await tx.user.update({ where: { id: order.buyerId }, data: { walletBalanceCents: { increment: order.amountCents } } });
      await tx.walletTransaction.create({
        data: {
          userId: order.buyerId,
          type: "REFUND",
          status: "COMPLETED",
          amountCents: order.amountCents,
          referenceType: "ORDER_REFUND",
          referenceId: order.id,
          note: `คืนเงิน ${order.product.title} เนื่องจากร้านค้าไม่จัดส่ง`,
        },
      });
      await tx.notification.create({
        data: {
          recipientId: order.buyerId,
          type: "REFUND_CREATED",
          title: "คืนเงินสำเร็จ",
          message: `ระบบคืนเงิน ${order.product.title} เข้ากระเป๋าของคุณแล้ว`,
          href: "/account/orders",
          productId: order.productId,
          orderId: order.id,
        },
      });
      result.refundsCompleted += 1;
    }

    const staleThreads = await tx.chatThread.findMany({
      where: { status: "ACTIVE", lastMessageAt: { lte: addMs(now, -CHAT_ARCHIVE_MS) } },
      take: 50,
    });

    for (const thread of staleThreads) {
      await tx.chatThread.update({ where: { id: thread.id }, data: { status: "ARCHIVED", archivedAt: now } });
      result.chatsArchived += 1;
    }

    const endedFavoriteProducts = await tx.product.findMany({
      where: { mode: "AUCTION", status: "ENDED" },
      include: {
        bids: { where: { status: "WINNING" }, select: { bidderId: true }, take: 1 },
        favorites: {
          where: { emailNotify: true, disabledAfterAuctionAt: null },
          select: { userId: true },
        },
      },
      take: 100,
    });

    for (const product of endedFavoriteProducts) {
      const winningBidderId = product.bids[0]?.bidderId;
      const userIdsToDisable = product.favorites.map((favorite) => favorite.userId).filter((userId) => userId !== winningBidderId);

      if (userIdsToDisable.length === 0) {
        continue;
      }

      const updateResult = await tx.favoriteProduct.updateMany({
        where: { productId: product.id, userId: { in: userIdsToDisable } },
        data: {
          emailNotify: false,
          disabledAfterAuctionAt: now,
        },
      });
      result.favoriteNotificationsDisabled += updateResult.count;
    }
  });

  return result;
};
