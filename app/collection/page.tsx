import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/shared/AppFooter";
import { FavoritesClient } from "@/components/shared/FavoritesClient";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const CollectionPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="retro-shell min-h-screen">
        <SimpleAppHeader user={null} />
        <main className="flex min-h-[70vh] items-center justify-center px-4">
          <section className="neon-panel max-w-md p-8 text-center">
            <h1 className="text-3xl font-bold">รายการโปรด</h1>
            <p className="mt-3 text-muted-foreground">กรุณาเข้าสู่ระบบก่อนดูและจัดการรายการโปรด</p>
            <Button asChild className="mt-6">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </section>
        </main>
        <AppFooter />
      </div>
    );
  }

  const favorites = await prisma.favoriteProduct.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          sellerShop: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return (
    <FavoritesClient
      viewerName={user.displayName}
      initialFavorites={favorites.map((favorite) => ({
        id: favorite.id,
        productId: favorite.productId,
        emailNotify: favorite.emailNotify,
        notifyOutbid: favorite.notifyOutbid,
        notifyEndingSoon: favorite.notifyEndingSoon,
        disabledAfterAuctionAt: favorite.disabledAfterAuctionAt?.toISOString() ?? null,
        product: {
          id: favorite.product.id,
          title: favorite.product.title,
          cardCode: favorite.product.cardCode,
          setName: favorite.product.setName,
          rarity: favorite.product.rarity,
          mode: favorite.product.mode,
          currentPriceCents: favorite.product.currentPriceCents,
          nextBidCents: favorite.product.nextBidCents,
          watcherCount: favorite.product.watcherCount,
          auctionEndsAt: favorite.product.auctionEndsAt?.toISOString() ?? null,
          imageUrl: favorite.product.imageUrl,
          sellerShop: favorite.product.sellerShop,
        },
      }))}
    />
  );
};

export default CollectionPage;
