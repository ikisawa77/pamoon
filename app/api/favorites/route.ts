import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { favoriteProductSchema, favoriteProductUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนดูรายการโปรด", 401);
    }

    const favorites = await prisma.favoriteProduct.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { productId: true, emailNotify: true, notifyOutbid: true, notifyEndingSoon: true },
    });

    return NextResponse.json({ ok: true, favorites });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด", 401);
    }

    const body = await request.json();
    const parsed = favoriteProductSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true },
    });

    if (!product) {
      return apiError("ไม่พบสินค้า", 404);
    }

    const favorite = await prisma.favoriteProduct.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      create: {
        userId: user.id,
        productId: product.id,
        emailNotify: parsed.data.emailNotify ?? true,
        notifyOutbid: parsed.data.notifyOutbid ?? true,
        notifyEndingSoon: parsed.data.notifyEndingSoon ?? true,
      },
      update: {
        emailNotify: parsed.data.emailNotify ?? true,
        notifyOutbid: parsed.data.notifyOutbid ?? true,
        notifyEndingSoon: parsed.data.notifyEndingSoon ?? true,
        disabledAfterAuctionAt: null,
      },
      select: { productId: true, emailNotify: true, notifyOutbid: true, notifyEndingSoon: true },
    });

    return NextResponse.json({ ok: true, favorite }, { status: 201 });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

export const PATCH = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนแก้ไขรายการโปรด", 401);
    }

    const body = await request.json();
    const parsed = favoriteProductUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const favorite = await prisma.favoriteProduct.update({
      where: { userId_productId: { userId: user.id, productId: parsed.data.productId } },
      data: {
        emailNotify: parsed.data.emailNotify,
        notifyOutbid: parsed.data.notifyOutbid,
        notifyEndingSoon: parsed.data.notifyEndingSoon,
      },
      select: { productId: true, emailNotify: true, notifyOutbid: true, notifyEndingSoon: true },
    });

    return NextResponse.json({ ok: true, favorite });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนลบรายการโปรด", 401);
    }

    const productId = new URL(request.url).searchParams.get("productId");

    if (!productId) {
      return apiError("ไม่พบรหัสสินค้า", 400);
    }

    await prisma.favoriteProduct.deleteMany({
      where: { userId: user.id, productId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
