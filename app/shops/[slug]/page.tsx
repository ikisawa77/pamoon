import Image from "next/image";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, CreditCard, Package, Star, Store, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/shared/AppFooter";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface ShopDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value / 100);

const formatDate = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "พร้อมส่ง";

const ShopDetailPage = async ({ params }: ShopDetailPageProps) => {
  const { slug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        orderBy: [{ mode: "asc" }, { createdAt: "desc" }],
        take: 80,
      },
      owner: {
        select: {
          displayName: true,
        },
      },
      _count: {
        select: {
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!shop) {
    notFound();
  }

  const auctionProducts = shop.products.filter((product) => product.mode === "AUCTION");
  const buyProducts = shop.products.filter((product) => product.mode === "BUY");

  return (
    <StorefrontPageLayout
      title={shop.name}
      description={`ร้านของ ${shop.owner.displayName} คะแนน ${shop.rating.toFixed(1)} จาก ${shop.reviewCount.toLocaleString("th-TH")} รีวิว เลือกเข้าประมูลหรือซื้อสินค้าได้จากหน้านี้`}
    >
      <section className="grid gap-5 rounded-[28px] border bg-background p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Badge>Verified Shop</Badge>
          <h2 className="mt-3 text-3xl font-black">{shop.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            รวมสินค้าทั้งประมูลและซื้อเลยจากร้านนี้ คลิกการ์ดเพื่อเข้าไปดูรายละเอียด เสนอราคา หรือเพิ่มสินค้าลงตะกร้าได้ทันที
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="#shop-auctions"><Trophy className="size-4" /> ดูสินค้าประมูล</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="#shop-buy-now"><CreditCard className="size-4" /> ดูสินค้าซื้อเลย</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ShopMetric icon={<Package className="size-5" />} label="สินค้า" value={shop._count.products.toLocaleString("th-TH")} />
          <ShopMetric icon={<Trophy className="size-5" />} label="ประมูล" value={auctionProducts.length.toLocaleString("th-TH")} />
          <ShopMetric icon={<Star className="size-5 fill-current" />} label="คะแนน" value={shop.rating.toFixed(1)} />
        </div>
      </section>

      <ProductSection id="shop-auctions" title="สินค้าประมูลของร้าน" products={auctionProducts} emptyText="ร้านนี้ยังไม่มีสินค้าประมูลที่เปิดอยู่" />
      <ProductSection id="shop-buy-now" title="สินค้าซื้อเลยของร้าน" products={buyProducts} emptyText="ร้านนี้ยังไม่มีสินค้าซื้อเลยที่เปิดขายอยู่" />

      <AppFooter />
    </StorefrontPageLayout>
  );
};

type ShopProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

const ProductSection = ({ id, title, products, emptyText }: { id: string; title: string; products: ShopProduct[]; emptyText: string }) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-2xl font-black">{title}</h2>
      <span className="text-sm text-muted-foreground">{products.length.toLocaleString("th-TH")} รายการ</span>
    </div>
    {products.length === 0 ? (
      <div className="rounded-2xl border bg-background p-8 text-center text-muted-foreground">{emptyText}</div>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => {
          const href = product.mode === "AUCTION" ? `/auctions/${product.id}` : `/buy-now/${product.id}`;
          return (
            <Link key={product.id} href={href} className="group overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[100/140] bg-muted">
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1280px) 20vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />
                ) : null}
                <Badge className="absolute left-3 top-3" variant={product.mode === "AUCTION" ? "default" : "secondary"}>
                  {product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}
                </Badge>
              </div>
              <div className="grid gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 min-h-10 font-semibold">{product.title}</h3>
                  <Badge variant="outline">{product.rarity}</Badge>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">{product.cardCode} · {product.setName}</p>
                <strong className="text-lg text-primary">{moneyFromCents(product.currentPriceCents)}</strong>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Store className="size-3" /> {product.conditionLabel}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> {formatDate(product.auctionEndsAt)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    )}
  </section>
);

const ShopMetric = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl bg-muted/50 p-4">
    <span className="text-primary">{icon}</span>
    <strong className="mt-3 block text-xl">{value}</strong>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default ShopDetailPage;
