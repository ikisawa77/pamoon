import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const slugify = (value: string) => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return slug || "reseller-shop";
};

const createUniqueShopSlug = async (shopName: string) => {
  const baseSlug = slugify(shopName);

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const existing = await prisma.shop.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      return apiError("อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const shopName = input.role === "RESELLER" ? input.shopName?.trim() : undefined;
    const shopSlug = shopName ? await createUniqueShopSlug(shopName) : undefined;

    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          role: input.role,
          status: "ACTIVE",
          walletBalanceCents: 0,
          bidLimitCents: input.role === "RESELLER" ? 300000 : 100000,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
      });

      if (shopName && shopSlug) {
        await transaction.shop.create({
          data: {
            ownerId: createdUser.id,
            name: shopName,
            slug: shopSlug,
            status: "APPROVED",
            rating: 0,
            reviewCount: 0,
          },
        });
      }

      await transaction.notification.create({
        data: {
          recipientId: createdUser.id,
          type: "SYSTEM",
          title: input.role === "RESELLER" ? "เปิดบัญชี Reseller สำเร็จ" : "สมัครสมาชิกสำเร็จ",
          message:
            input.role === "RESELLER"
              ? "บัญชีร้านค้าของคุณพร้อมสำหรับลงสินค้า ซื้อสินค้า และเข้าร่วมประมูลแล้ว"
              : "บัญชีสมาชิกพร้อมใช้งานสำหรับซื้อสินค้า เข้าร่วมประมูล และติดตามรายการโปรด",
          href: input.role === "RESELLER" ? "/account/seller" : "/account",
        },
      });

      return createdUser;
    });

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setSessionCookie(token);

    return NextResponse.json(
      {
        ok: true,
        user,
        nextUrl: user.role === "RESELLER" ? "/account/seller" : "/account",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return unknownError(error);
  }
};
