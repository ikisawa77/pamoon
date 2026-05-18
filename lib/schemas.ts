import { z } from "zod";
import { productCategoryValues } from "@/lib/card-catalog";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );

const thaiPhoneRegex = /^(?:\+66|0)[689]\d{8}$/;

export const topUpSchema = z.object({
  amount: z.coerce.number().int().min(100).max(50000),
});

export const shopRegistrationSchema = z.object({
  shopName: z.string().min(2).max(80),
  contact: z.string().min(2).max(120),
  payoutAccount: z.string().min(3).max(160),
  acceptedTerms: z.literal(true),
});

export const otpSendSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(thaiPhoneRegex, "กรุณากรอกเบอร์โทรศัพท์ไทยให้ถูกต้อง เช่น 0812345678 หรือ +66812345678"),
});

export const otpVerifySchema = otpSendSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/, "รหัส OTP ต้องเป็นตัวเลข 6 หลัก"),
});

export const sellerApplicationSchema = z.object({
  shopName: z.string().trim().min(2, "กรุณากรอกชื่อร้านค้า").max(120),
  description: z.string().trim().min(10, "กรุณากรอกรายละเอียดร้านอย่างน้อย 10 ตัวอักษร").max(2000),
  hasPhysicalStore: z.boolean(),
  logoUrl: optionalText(255),
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ").max(80),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(80),
  phone: z.string().trim().regex(thaiPhoneRegex, "กรุณายืนยันเบอร์โทรศัพท์ไทยให้ถูกต้อง"),
  bankName: z.string().trim().min(2, "กรุณาเลือกธนาคาร").max(120),
  bankBranch: z.string().trim().min(2, "กรุณากรอกสาขาธนาคาร").max(120),
  bankAccountName: z.string().trim().min(2, "กรุณากรอกชื่อบัญชี").max(120),
  bankAccountNumber: z.string().trim().regex(/^\d{6,20}$/, "เลขที่บัญชีต้องเป็นตัวเลข 6-20 หลัก"),
  bankBookImageUrl: optionalText(255),
  addressLine: z.string().trim().min(5, "กรุณากรอกที่อยู่").max(1000),
  subdistrict: z.string().trim().min(2, "กรุณากรอกแขวง/ตำบล").max(120),
  district: z.string().trim().min(2, "กรุณากรอกเขต/อำเภอ").max(120),
  province: z.string().trim().min(2, "กรุณากรอกจังหวัด").max(120),
  postalCode: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "กรุณายอมรับเงื่อนไขการสมัครร้านค้า" }),
  }),
});

export const listingSchema = z.object({
  mode: z.enum(["auction", "buy"]),
  game: z.literal("One Piece Card Game (Japanese)"),
  category: z.enum(productCategoryValues),
  title: z.string().min(2).max(120),
  code: z
    .string()
    .trim()
    .regex(
      /^(?:OP|EB|ST)\d{2}-\d{3}$|^PRB\d{2}-\d{3}$/i,
      "รหัสการ์ดต้องอยู่ในรูปแบบ OP01-121, EB01-001, PRB01-001 หรือ ST01-001",
    )
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
    displayName: z.string().trim().min(2, "กรุณากรอกชื่อที่แสดง").max(120),
    email: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง").max(191).transform((value) => value.toLowerCase()),
    password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").max(128),
    confirmPassword: z.string().min(6, "กรุณายืนยันรหัสผ่าน").max(128),
    role: z.literal("MEMBER").default("MEMBER"),
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "รหัสผ่านยืนยันไม่ตรงกัน",
        path: ["confirmPassword"],
      });
    }
  });

export type TopUpInput = z.infer<typeof topUpSchema>;
export type ShopRegistrationInput = z.infer<typeof shopRegistrationSchema>;
export type OtpSendInput = z.infer<typeof otpSendSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;
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
