import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { initialMarketplace } from "@/lib/mock-data";
import type {
  AuctionProduct,
  ListingMode,
  MarketplaceSnapshot,
  ProductCategory,
  ProductRarity,
} from "@/types/marketplace";

const moneyFromCents = (value: number) => Math.round(value / 100);

const formatAuctionEnds = (date: Date | null, mode: ListingMode) => {
  if (mode === "buy") {
    return "พร้อมส่ง";
  }

  if (!date) {
    return "รอวันปิดประมูล";
  }

  return `เหลือ 2 ปี (หมด ${date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })})`;
};

const toCategory = (category: string) => category.toLowerCase() as ProductCategory;
const toMode = (mode: string) => mode.toLowerCase() as ListingMode;
const toRarity = (rarity: string) => rarity as ProductRarity;

export const getMarketplaceSnapshot = cache(async (): Promise<MarketplaceSnapshot> => {
  try {
    const [products, demoUser] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: {
          sellerShop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          bids: {
            orderBy: { amountCents: "desc" },
            take: 1,
            include: {
              bidder: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: [{ mode: "asc" }, { auctionEndsAt: "asc" }, { createdAt: "desc" }],
        take: 160,
      }),
      prisma.user.findFirst({
        where: { role: "MEMBER" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          walletBalanceCents: true,
          bidLimitCents: true,
        },
      }),
    ]);

    if (products.length === 0) {
      return initialMarketplace;
    }

    const mappedProducts: AuctionProduct[] = products.map((product, index) => {
      const mode = toMode(product.mode);

      return {
        id: product.id,
        title: product.title,
        code: `${product.cardCode} · ${product.setName}`,
        seller: product.sellerShop.name,
        shopId: product.sellerShop.slug,
        topBidder: product.bids[0]?.bidder.displayName ?? "รอผู้เสนอราคา",
        mode,
        category: toCategory(product.category),
        rarity: toRarity(product.rarity),
        openingPrice: moneyFromCents(product.openingPriceCents),
        currentPrice: moneyFromCents(product.currentPriceCents),
        nextBid: moneyFromCents(product.nextBidCents),
        watchers: product.watcherCount,
        endsIn: formatAuctionEnds(product.auctionEndsAt, mode),
        imagePositionClass: `object-pos-${(index % 3) + 1}`,
        hot: index % 5 === 0,
      };
    });

    return {
      wallet: {
        balance: moneyFromCents(demoUser?.walletBalanceCents ?? 0),
        pendingPayment: 320,
        bidLimit: moneyFromCents(demoUser?.bidLimitCents ?? 0),
      },
      products: mappedProducts,
      activities: initialMarketplace.activities,
      currentUserId: demoUser?.id,
      primaryShopId: products[0]?.sellerShop.id,
    };
  } catch {
    return initialMarketplace;
  }
});
