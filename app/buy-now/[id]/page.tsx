import { notFound } from "next/navigation";
import { BuyNowDetailClient } from "@/components/shared/BuyNowDetailClient";
import { getViewerSummary } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface BuyNowDetailPageProps {
  params: Promise<{ id: string }>;
}

const BuyNowDetailPage = async ({ params }: BuyNowDetailPageProps) => {
  const [{ id }, viewer] = await Promise.all([params, getViewerSummary()]);
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
    },
  });

  if (!product || product.mode !== "BUY" || product.status !== "ACTIVE") {
    notFound();
  }

  return (
    <BuyNowDetailClient
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
        currentPriceCents: product.currentPriceCents,
        watcherCount: product.watcherCount,
        sellerShop: product.sellerShop,
      }}
      viewer={viewer ?? { displayName: "ผู้เยี่ยมชม", role: "GUEST" }}
    />
  );
};

export default BuyNowDetailPage;
