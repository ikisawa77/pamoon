import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, unknownError, validationError } from "@/lib/api-response";
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
    const body = await request.json();
    const parsed = createProductApiSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const input = parsed.data;
    const sellerShop = await prisma.shop.findUnique({ where: { id: input.sellerShopId } });

    if (!sellerShop) {
      return apiError("ไม่พบร้านค้าที่ต้องการลงสินค้า", 404);
    }

    const priceCents = input.mode === "auction" ? input.openingPrice * 100 : input.buyNowPrice * 100;
    const product = await prisma.product.create({
      data: {
        sellerShopId: input.sellerShopId,
        title: input.title,
        cardCode: input.code,
        setCode: input.series,
        setName: input.series,
        category: mapCategory(input.category),
        rarity: mapRarity(input.rarity),
        mode: mapMode(input.mode),
        conditionLabel: input.condition,
        description: input.description,
        imageUrl: input.imageUrl,
        openingPriceCents: input.openingPrice * 100,
        currentPriceCents: priceCents,
        nextBidCents: priceCents + 25000,
        buyNowPriceCents: input.buyNowPrice > 0 ? input.buyNowPrice * 100 : null,
        auctionEndsAt: input.mode === "auction" ? new Date("2028-04-28T17:00:00.000Z") : null,
      },
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

