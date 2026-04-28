import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  })
    .format(value / 100)
    .replace("THB", "฿");

const ShopDetailPage = async ({ params }: ShopDetailPageProps) => {
  const { slug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        orderBy: [{ mode: "asc" }, { createdAt: "desc" }],
        take: 60,
      },
      owner: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!shop) {
    notFound();
  }

  return (
    <StorefrontPageLayout title={shop.name} description={`ร้านของ ${shop.owner.displayName} คะแนน ${shop.rating.toFixed(1)} จาก ${shop.reviewCount.toLocaleString("th-TH")} รีวิว`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shop.products.map((product) => (
          <Card key={product.id} className="overflow-hidden p-0">
            <div className="product-art object-pos-1 aspect-[4/3] bg-muted" />
            <CardHeader className="pb-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{product.title}</CardTitle>
                <Badge variant="outline">{product.rarity}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-4 text-sm">
              <span className="text-muted-foreground">{product.cardCode} · {product.setName}</span>
              <strong className="text-lg text-primary">{moneyFromCents(product.currentPriceCents)}</strong>
              <Badge>{product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </StorefrontPageLayout>
  );
};

export default ShopDetailPage;
