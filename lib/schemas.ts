import { z } from "zod";

export const topUpSchema = z.object({
  amount: z.coerce.number().int().min(100).max(50000),
});

export const shopRegistrationSchema = z.object({
  shopName: z.string().min(2).max(80),
  contact: z.string().min(2).max(120),
  payoutAccount: z.string().min(3).max(160),
  acceptedTerms: z.literal(true),
});

export const listingSchema = z.object({
  mode: z.enum(["auction", "buy"]),
  category: z.enum(["op01", "op02", "op03", "op04", "op05"]),
  title: z.string().min(2).max(120),
  series: z.string().min(1).max(60),
  code: z.string().min(1).max(40),
  rarity: z.enum(["C", "UC", "R", "L", "SR", "SEC", "SP", "P"]),
  openingPrice: z.coerce.number().int().min(100).max(500000),
  buyNowPrice: z.coerce.number().int().min(0).max(500000),
  duration: z.string().min(1).max(40),
  condition: z.string().min(1).max(40),
});

export const createProductApiSchema = listingSchema.extend({
  sellerShopId: z.string().min(1),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
});

export const createBidApiSchema = z.object({
  productId: z.string().min(1),
  bidderId: z.string().min(1),
  amountCents: z.coerce.number().int().min(1),
});

export const topUpApiSchema = z.object({
  userId: z.string().min(1),
  amountCents: z.coerce.number().int().min(100),
});

export const createOrderApiSchema = z.object({
  productId: z.string().min(1),
  buyerId: z.string().min(1),
  shippingName: z.string().min(2).max(120).optional(),
  shippingAddress: z.string().min(5).max(1000).optional(),
});

export const orderActionSchema = z.object({
  action: z.enum(["pay", "ship", "extend-shipping"]),
  trackingNumber: z.string().trim().min(3).max(120).optional(),
});

export const chatMessageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(1000),
});

export const notificationQuerySchema = z.object({
  status: z.enum(["all", "unread"]).optional(),
  category: z.enum(["all", "orders", "auctions", "chat", "system", "action"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(191),
  password: z.string().min(1).max(128),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
export type ShopRegistrationInput = z.infer<typeof shopRegistrationSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type CreateProductApiInput = z.infer<typeof createProductApiSchema>;
export type CreateBidApiInput = z.infer<typeof createBidApiSchema>;
export type TopUpApiInput = z.infer<typeof topUpApiSchema>;
export type CreateOrderApiInput = z.infer<typeof createOrderApiSchema>;
export type OrderActionInput = z.infer<typeof orderActionSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
