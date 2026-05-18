import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { lookupCardByCode } from "@/lib/card-lookup";
import { productCategoryValues } from "@/lib/card-catalog";
import { apiError, unknownError, validationError } from "@/lib/api-response";

export const runtime = "nodejs";

const lookupSchema = z.object({
  code: z.string().trim().min(6).max(20),
  category: z.enum(productCategoryValues).optional(),
});

export const GET = async (request: NextRequest) => {
  try {
    const parsed = lookupSchema.safeParse({
      code: request.nextUrl.searchParams.get("code"),
      category: request.nextUrl.searchParams.get("category") ?? undefined,
    });

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const card = await lookupCardByCode(parsed.data.code, parsed.data.category);

    if (!card) {
      return apiError("ไม่พบข้อมูลการ์ดจากรหัสนี้", 404);
    }

    return NextResponse.json({ ok: true, card });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
