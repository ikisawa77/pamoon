import { z } from "zod";
import { productCategoryValues } from "@/lib/card-catalog";

const optionalText = (maxLength: number) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().trim().max(maxLength).optional());

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
  game: z.literal("One Piece Card Game (Japanese)"),
  category: z.enum(productCategoryValues),
  title: z.string().min(2).max(120),
  code: z
    .string()
    .trim()
    .regex(/^(?:OP|EB|ST)\d{2}-\d{3}$|^PRB\d{2}-\d{3}$/i, "รหัสการ์ดต้องอยู่ในรูปแบบ OP01-121, EB01-001, PRB01-001 หรือ ST01-001")
    .transform((value) => value.toUpperCase()),
  rarity: z.enum(["C", "UC", "R", "L", "SR", "SEC", "SP", "P"]),
  openingPrice: z.coerce.number().int().min(100).max(500000),
  bidIncrement: z.coerce.number().int().min(10).max(500000).optional(),
  buyNowPrice: z.coerce.number().int().min(0).max(500000),
  duration: z.string().min(1).max(40),
  auctionEndsAt: optionalText(80),
  condition: z.string().min(1).max(40),
  description: z.string().trim().min(10).max(2000),
});

export const createProductApiSchema = listingSchema.extend({
  sellerShopId: z.string().min(1).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(255)
    .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "รูปสินค้าต้องเป็น URL หรือไฟล์ที่อัปโหลดในระบบ")
    .optional(),
});

export const createBidApiSchema = z.object({
  productId: z.string().min(1),
  bidderId: z.string().min(1).optional(),
  amountCents: z.coerce.number().int().min(1),
});

export const topUpApiSchema = z.object({
  userId: z.string().min(1),
  amountCents: z.coerce.number().int().min(100),
});

export const createOrderApiSchema = z.object({
  productId: z.string().min(1),
  buyerId: z.string().min(1).optional(),
  shippingName: z.string().min(2).max(120).optional(),
  shippingAddress: z.string().min(5).max(1000).optional(),
});

export const cartCheckoutApiSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(20),
  shippingName: z.string().trim().min(2).max(120).optional(),
  shippingAddress: z.string().trim().min(5).max(1000).optional(),
});

export const orderActionSchema = z.object({
  action: z.enum(["pay", "ship", "extend-shipping"]),
  trackingNumber: z.string().trim().min(3).max(120).optional(),
});

export const chatMessageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(1000),
});

export const homeContentUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: optionalText(255),
  body: optionalText(8000),
  href: optionalText(255),
  imageUrl: optionalText(255),
  badge: optionalText(80),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const homeContentCreateSchema = homeContentUpdateSchema.extend({
  type: z.enum(["SLIDE", "PROMOTION", "ARTICLE", "FEATURED_SHOP"]),
});

export const favoriteProductSchema = z.object({
  productId: z.string().trim().min(1),
  emailNotify: z.boolean().optional(),
  notifyOutbid: z.boolean().optional(),
  notifyEndingSoon: z.boolean().optional(),
});

export const favoriteProductUpdateSchema = z.object({
  productId: z.string().trim().min(1),
  emailNotify: z.boolean().optional(),
  notifyOutbid: z.boolean().optional(),
  notifyEndingSoon: z.boolean().optional(),
});

export const notificationQuerySchema = z.object({
  status: z.enum(["all", "unread"]).optional(),
  category: z.enum(["all", "orders", "auctions", "chat", "system", "action"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(191).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(191).transform((value) => value.toLowerCase()),
    password: z.string().min(6).max(128),
    confirmPassword: z.string().min(6).max(128),
    role: z.enum(["MEMBER", "RESELLER"]),
    shopName: z.string().trim().max(120).optional(),
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "รหัสผ่านยืนยันไม่ตรงกัน",
        path: ["confirmPassword"],
      });
    }

    if (input.role === "RESELLER" && (!input.shopName || input.shopName.length < 2)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "กรุณากรอกชื่อร้านค้าสำหรับ Reseller",
        path: ["shopName"],
      });
    }
  });

export type TopUpInput = z.infer<typeof topUpSchema>;
export type ShopRegistrationInput = z.infer<typeof shopRegistrationSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type CreateProductApiInput = z.infer<typeof createProductApiSchema>;
export type CreateBidApiInput = z.infer<typeof createBidApiSchema>;
export type TopUpApiInput = z.infer<typeof topUpApiSchema>;
export type CreateOrderApiInput = z.infer<typeof createOrderApiSchema>;
export type CartCheckoutApiInput = z.infer<typeof cartCheckoutApiSchema>;
export type OrderActionInput = z.infer<typeof orderActionSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type HomeContentUpdateInput = z.infer<typeof homeContentUpdateSchema>;
export type HomeContentCreateInput = z.infer<typeof homeContentCreateSchema>;
export type FavoriteProductInput = z.infer<typeof favoriteProductSchema>;
export type FavoriteProductUpdateInput = z.infer<typeof favoriteProductUpdateSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
