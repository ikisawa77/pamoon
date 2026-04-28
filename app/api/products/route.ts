import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, unknownError, validationError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CARD_GAME_NAME, getCardSetDefinition } from "@/lib/card-catalog";
import { createProductApiSchema } from "@/lib/schemas";
import type { ListingMode, ProductCategory, ProductRarity } from "@/types/marketplace";

export const runtime = "nodejs";

const mapCategory = (category: ProductCategory) => category.toUpperCase() as Uppercase<ProductCategory>;
const mapMode = (mode: ListingMode) => mode.toUpperCase() as Uppercase<ListingMode>;
const mapRarity = (rarity: ProductRarity) => rarity;

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("mode");
    const rarity = searchParams.get("rarity");
    const set = searchParams.get("set");
    const query = searchParams.get("q");

    const products = await prisma.product.findMany({
      where: {
        ...(mode === "auction" || mode === "buy" ? { mode: mapMode(mode) } : {}),
        ...(rarity ? { rarity: rarity as Uppercase<ProductRarity> } : {}),
        ...(set ? { category: set.toUpperCase() as Uppercase<ProductCategory> } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { cardCode: { contains: query } },
                { setName: { contains: query } },
              ],
            }
          : {}),
      },
      include: {
        sellerShop: {
          select: {
            id: true,
            name: true,
            slug: true,
            rating: true,
            reviewCount: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { auctionEndsAt: "asc" }, { createdAt: "desc" }],
      take: 120,
    });

    return NextResponse.json({ ok: true, products });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError("กรุณาเข้าสู่ระบบก่อนลงสินค้า", 401);
    }

    if (user.role !== "SHOP" && user.role !== "ADMIN") {
      return apiError("บัญชีนี้ยังไม่มีสิทธิ์ลงสินค้า", 403);
    }

    if (user.status !== "ACTIVE") {
      return apiError("บัญชีนี้ยังไม่พร้อมลงสินค้า", 403);
    }

    const body = await request.json();
    const parsed = createProductApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const cardSet = getCardSetDefinition(input.category);
    const sellerShop = await prisma.shop.findFirst({
      where: {
        ownerId: user.id,
        status: "APPROVED",
      },
      orderBy: [
        user.role === "ADMIN" ? { slug: "asc" } : { createdAt: "asc" },
      ],
    });

    if (!sellerShop) {
      return apiError(user.role === "ADMIN" ? "ไม่พบร้าน Admin Dev Shop สำหรับลงสินค้าทดสอบ" : "ไม่พบร้านค้าที่อนุมัติแล้ว", 404);
    }

    const priceCents = input.mode === "auction" ? input.openingPrice * 100 : input.buyNowPrice * 100;
    const product = await prisma.product.create({
      data: {
        sellerShopId: sellerShop.id,
        title: input.title,
        cardCode: input.code,
        setCode: cardSet.setCode,
        setName: cardSet.setName,
        category: mapCategory(input.category),
        rarity: mapRarity(input.rarity),
        mode: mapMode(input.mode),
        conditionLabel: input.condition,
        description: `${CARD_GAME_NAME}\n${cardSet.label}\n${input.description}`,
        imageUrl: input.imageUrl,
        openingPriceCents: input.openingPrice * 100,
        currentPriceCents: priceCents,
        nextBidCents: priceCents + 25000,
        buyNowPriceCents: input.buyNowPrice > 0 ? input.buyNowPrice * 100 : null,
        auctionEndsAt: input.mode === "auction" ? new Date("2028-04-28T17:00:00.000Z") : null,
      },
      include: {
        sellerShop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error: unknown) {
    return unknownError(error);
  }
};
