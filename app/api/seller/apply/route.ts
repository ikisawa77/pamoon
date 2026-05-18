import { NextRequest, NextResponse } from "next/server";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { sellerApplicationSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `shop-${Date.now()}`;

const uniqueShopSlug = async (shopName: string, currentShopId?: string) => {
  const base = slugify(shopName);
  let slug = base;
  let index = 2;

  while (true) {
    const existing = await prisma.shop.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === currentShopId) return slug;
    slug = `${base}-${index}`;
    index += 1;
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนสมัครร้านค้า", 401);
    }

    if (user.role === "ADMIN") {
      return apiError("บัญชีผู้ดูแลใช้ร้านทดสอบ Admin Dev Shop ได้โดยตรง ไม่ต้องส่งคำขอสมัครร้านค้า", 400);
    }

    if (user.role !== "MEMBER" && user.role !== "RESELLER") {
      return apiError("บัญชีนี้ไม่สามารถสมัครร้านค้าได้", 403);
    }

    const body = await request.json();
    const parsed = sellerApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const existingName = await prisma.shop.findFirst({
      where: {
        name: input.shopName,
        ownerId: { not: user.id },
      },
      select: { id: true },
    });

    if (existingName) {
      return apiError("ชื่อร้านค้านี้ถูกใช้งานแล้ว", 409);
    }

    const verifiedOtp = await prisma.phoneOtp.findFirst({
      where: {
        userId: user.id,
        phone: input.phone,
        verifiedAt: { not: null },
      },
      orderBy: { verifiedAt: "desc" },
      select: { verifiedAt: true },
    });

    if (!verifiedOtp?.verifiedAt) {
      return apiError("กรุณายืนยันเบอร์โทรศัพท์ด้วย OTP ก่อนส่งคำขอเปิดร้าน", 400);
    }

    const currentShop = await prisma.shop.findFirst({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, status: true },
    });

    if (currentShop && currentShop.status === "PENDING") {
      return apiError("คุณมีคำขอเปิดร้านที่รอตรวจสอบอยู่แล้ว", 409);
    }

    if (currentShop && currentShop.status === "APPROVED") {
      return apiError("บัญชีนี้มีร้านค้าที่ผ่านการอนุมัติแล้ว", 409);
    }

    const shopPayload = {
      name: input.shopName,
      description: input.description,
      hasPhysicalStore: input.hasPhysicalStore,
      logoUrl: input.logoUrl ?? null,
      applicantFirstName: input.firstName,
      applicantLastName: input.lastName,
      contactEmail: user.email,
      phone: input.phone,
      phoneVerifiedAt: verifiedOtp.verifiedAt,
      bankName: input.bankName,
      bankBranch: input.bankBranch,
      bankAccountName: input.bankAccountName,
      bankAccountNumber: input.bankAccountNumber,
      bankBookImageUrl: input.bankBookImageUrl ?? null,
      addressLine: input.addressLine,
      subdistrict: input.subdistrict,
      district: input.district,
      province: input.province,
      postalCode: input.postalCode,
      status: "PENDING" as const,
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    };

    const shop = currentShop
      ? await prisma.shop.update({
          where: { id: currentShop.id },
          data: {
            ...shopPayload,
            slug: await uniqueShopSlug(input.shopName, currentShop.id),
          },
          select: { id: true, name: true, slug: true, status: true },
        })
      : await prisma.shop.create({
          data: {
            ownerId: user.id,
            slug: await uniqueShopSlug(input.shopName),
            ...shopPayload,
          },
          select: { id: true, name: true, slug: true, status: true },
        });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: [
        {
          recipientId: user.id,
          type: "SHOP_MESSAGE",
          title: "ส่งคำขอเปิดร้านแล้ว",
          message: "ผู้ดูแลระบบจะตรวจสอบข้อมูลร้านค้า เอกสาร และเบอร์โทรศัพท์ก่อนอนุมัติ",
          href: "/account/seller",
        },
        ...admins.map((admin) => ({
          recipientId: admin.id,
          type: "SHOP_MESSAGE" as const,
          title: "มีคำขอเปิดร้านใหม่",
          message: `${input.shopName} ส่งคำขอเปิดร้านและรอการตรวจสอบ`,
          href: "/admin",
        })),
      ],
    });

    return NextResponse.json({ ok: true, message: "ส่งคำขอเปิดร้านสำเร็จ", shop });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
