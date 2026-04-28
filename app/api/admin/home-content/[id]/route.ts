import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { homeContentUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

interface HomeContentRouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = async (request: NextRequest, context: HomeContentRouteContext) => {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return apiError("ไม่มีสิทธิ์แก้ไขหน้าแรก", 403);
    }

    const body = await request.json();
    const parsed = homeContentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { id } = await context.params;
    const content = await prisma.homeContent.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ ok: true, content });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
