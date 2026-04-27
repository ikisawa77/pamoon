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
  category: z.enum(["pokemon", "sealed", "single", "onepiece"]),
  title: z.string().min(2).max(120),
  series: z.string().min(1).max(60),
  code: z.string().min(1).max(40),
  rarity: z.enum(["SEC", "UR", "SR", "R", "C", "SAR", "SP", "HR"]),
  openingPrice: z.coerce.number().int().min(100).max(500000),
  buyNowPrice: z.coerce.number().int().min(0).max(500000),
  duration: z.string().min(1).max(40),
  condition: z.string().min(1).max(40),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
export type ShopRegistrationInput = z.infer<typeof shopRegistrationSchema>;
export type ListingInput = z.infer<typeof listingSchema>;

