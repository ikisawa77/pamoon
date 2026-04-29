import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { sanitizeRichText } from "@/lib/richtext";
import { homeContentCreateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return apiError("ไม่มีสิทธิ์เพิ่มเนื้อหาหน้าแรก", 403);
    }

    const body = await request.json();
    const parsed = homeContentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const content = await prisma.homeContent.create({
      data: {
        ...input,
        body: input.type === "ARTICLE" ? sanitizeRichText(input.body) : input.body,
      },
    });

    return NextResponse.json({ ok: true, content }, { status: 201 });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
