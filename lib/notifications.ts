import { prisma } from "@/lib/db/prisma";

export const createNotification = async (input: {
  recipientId: string;
  actorId?: string;
  type:
    | "ORDER_CREATED"
    | "ORDER_PAID"
    | "ORDER_SHIPPED"
    | "BID_PLACED"
    | "BID_OUTBID"
    | "BID_WINNING"
    | "AUCTION_WON"
    | "PAYMENT_DUE"
    | "PAYMENT_OVERDUE"
    | "SHIPPING_DUE"
    | "SHIPPING_EXTENDED"
    | "SHIPPING_OVERDUE"
    | "REFUND_CREATED"
    | "ACCOUNT_SUSPENDED"
    | "CHAT_MESSAGE"
    | "SHOP_MESSAGE"
    | "SYSTEM";
  title: string;
  message: string;
  href?: string;
  productId?: string;
  orderId?: string;
  bidId?: string;
}) =>
  prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      productId: input.productId,
      orderId: input.orderId,
      bidId: input.bidId,
    },
  });
