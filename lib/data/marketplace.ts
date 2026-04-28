import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { initialMarketplace } from "@/lib/mock-data";
import type {
  AuctionProduct,
  ListingMode,
  MarketplaceSnapshot,
  ProductCategory,
  ProductRarity,
  ViewerSummary,
} from "@/types/marketplace";

const moneyFromCents = (value: number) => Math.round(value / 100);

const guestViewer: ViewerSummary = {
  displayName: "ผู้เยี่ยมชม",
  role: "GUEST",
};

const formatAuctionEnds = (date: Date | null, mode: ListingMode) => {
  if (mode === "buy") return "พร้อมส่ง";
  if (!date) return "รอกำหนดวันปิดประมูล";

  return `หมด ${date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};

const toCategory = (category: string) => category.toLowerCase() as ProductCategory;
const toMode = (mode: string) => mode.toLowerCase() as ListingMode;
const toRarity = (rarity: string) => rarity as ProductRarity;

const fallbackSnapshot = (viewer: ViewerSummary | null): MarketplaceSnapshot => ({
  ...initialMarketplace,
  wallet: {
    balance: 0,
    pendingPayment: 0,
    bidLimit: 0,
  },
  viewer: viewer ?? guestViewer,
});

export const getMarketplaceSnapshot = cache(
  async (viewer: ViewerSummary | null = null): Promise<MarketplaceSnapshot> => {
    try {
      const [products, viewerWallet] = await Promise.all([
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
              where: { status: "WINNING" },
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
            favorites: {
              where: { userId: viewer?.id ?? "__guest__" },
              select: { id: true },
            },
          },
          orderBy: [{ mode: "asc" }, { auctionEndsAt: "asc" }, { createdAt: "desc" }],
          take: 160,
        }),
        viewer?.id
          ? prisma.user.findUnique({
              where: { id: viewer.id },
              select: {
                walletBalanceCents: true,
                bidLimitCents: true,
              },
            })
          : Promise.resolve(null),
      ]);

      if (products.length === 0) {
        return fallbackSnapshot(viewer);
      }

      const mappedProducts: AuctionProduct[] = products.map((product, index) => {
        const mode = toMode(product.mode);

        return {
          id: product.id,
          title: product.title,
          code: `${product.cardCode} · ${product.setName}`,
          seller: product.sellerShop.name,
          shopId: product.sellerShop.slug,
          topBidder: product.bids[0]?.bidder.displayName ?? "ยังไม่มีผู้เสนอราคา",
          mode,
          category: toCategory(product.category),
          rarity: toRarity(product.rarity),
          openingPrice: moneyFromCents(product.openingPriceCents),
          currentPrice: moneyFromCents(product.currentPriceCents),
          nextBid: moneyFromCents(product.nextBidCents),
          watchers: product.watcherCount,
          endsIn: formatAuctionEnds(product.auctionEndsAt, mode),
          auctionEndsAt: product.auctionEndsAt?.toISOString() ?? null,
          imageUrl: product.imageUrl,
          imagePositionClass: `object-pos-${(index % 3) + 1}`,
          hot: index % 5 === 0,
          isFavorite: product.favorites.length > 0,
        };
      });

      const viewerCanTrade = viewer?.role === "MEMBER" || viewer?.role === "SHOP" || viewer?.role === "ADMIN";
      const firstShop = products[0]?.sellerShop.id;

      return {
        wallet: {
          balance: moneyFromCents(viewerWallet?.walletBalanceCents ?? 0),
          pendingPayment: viewerCanTrade ? 320 : 0,
          bidLimit: moneyFromCents(viewerWallet?.bidLimitCents ?? 0),
        },
        products: mappedProducts,
        activities: initialMarketplace.activities,
        viewer: viewer ?? guestViewer,
        currentUserId: viewerCanTrade ? viewer?.id : undefined,
        primaryShopId: viewer?.shopId ?? firstShop,
      };
    } catch {
      return fallbackSnapshot(viewer);
    }
  },
);
