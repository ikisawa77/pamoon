import { HomepageExperience } from "@/components/shared/HomepageExperience";
import { getViewerSummary } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const HomePage = async () => {
  const viewer = await getViewerSummary();
  const [contents, endingAuctions, latestAuctions, latestSales, recommendedShops] = await Promise.all([
    prisma.homeContent.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      take: 24,
    }),
    prisma.product.findMany({
      where: { mode: "AUCTION", status: "ACTIVE" },
      orderBy: [{ auctionEndsAt: "asc" }, { currentPriceCents: "desc" }],
      take: 8,
      include: { sellerShop: { select: { name: true, slug: true } } },
    }),
    prisma.product.findMany({
      where: { mode: "AUCTION", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { sellerShop: { select: { name: true, slug: true } } },
    }),
    prisma.product.findMany({
      where: { mode: "BUY", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { sellerShop: { select: { name: true, slug: true } } },
    }),
    prisma.shop.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 4,
      include: { _count: { select: { products: true } } },
    }),
  ]);

  const serializeProduct = (product: (typeof endingAuctions)[number]) => ({
    id: product.id,
    title: product.title,
    cardCode: product.cardCode,
    setName: product.setName,
    rarity: product.rarity,
    mode: product.mode,
    currentPriceCents: product.currentPriceCents,
    imageUrl: product.imageUrl,
    auctionEndsAt: product.auctionEndsAt?.toISOString() ?? null,
    watcherCount: product.watcherCount,
    sellerShop: {
      name: product.sellerShop.name,
      slug: product.sellerShop.slug,
    },
  });

  return (
    <HomepageExperience
      contents={contents.map((content) => ({
        id: content.id,
        type: content.type,
        title: content.title,
        subtitle: content.subtitle,
        body: content.body,
        href: content.href,
        imageUrl: content.imageUrl,
        badge: content.badge,
        sortOrder: content.sortOrder,
      }))}
      endingAuctions={endingAuctions.map(serializeProduct)}
      latestAuctions={latestAuctions.map(serializeProduct)}
      latestSales={latestSales.map(serializeProduct)}
      recommendedShops={recommendedShops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        _count: shop._count,
      }))}
      viewerName={viewer?.displayName ?? "เข้าสู่ระบบ"}
    />
  );
};

export default HomePage;
