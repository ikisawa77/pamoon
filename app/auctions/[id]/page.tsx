import { notFound } from "next/navigation";
import { AuctionDetailClient } from "@/components/shared/AuctionDetailClient";
import { getViewerSummary } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface AuctionDetailPageProps {
  params: Promise<{ id: string }>;
}

const AuctionDetailPage = async ({ params }: AuctionDetailPageProps) => {
  const { id } = await params;
  const viewer = await getViewerSummary();
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sellerShop: {
        select: {
          name: true,
          slug: true,
          rating: true,
          reviewCount: true,
        },
      },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 50,
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
  });

  if (!product || product.mode !== "AUCTION") {
    notFound();
  }

  return (
    <AuctionDetailClient
      viewer={viewer ?? { displayName: "ผู้เยี่ยมชม", role: "GUEST" }}
      product={{
        id: product.id,
        title: product.title,
        cardCode: product.cardCode,
        setCode: product.setCode,
        setName: product.setName,
        rarity: product.rarity,
        conditionLabel: product.conditionLabel,
        description: product.description,
        imageUrl: product.imageUrl,
        openingPriceCents: product.openingPriceCents,
        currentPriceCents: product.currentPriceCents,
        nextBidCents: product.nextBidCents,
        watcherCount: product.watcherCount,
        auctionEndsAt: product.auctionEndsAt?.toISOString() ?? null,
        sellerShop: product.sellerShop,
        bids: product.bids.map((bid) => ({
          id: bid.id,
          bidderName: bid.bidder.displayName,
          amountCents: bid.amountCents,
          status: bid.status,
          createdAt: bid.createdAt.toISOString(),
        })),
        isFavorite: product.favorites.length > 0,
      }}
    />
  );
};

export default AuctionDetailPage;
