import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { prisma } from "@/lib/db/prisma";
import type { ProductRarity } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const rarityOrder: ProductRarity[] = ["C", "UC", "R", "L", "SR", "SEC", "SP", "P"];

const CollectionPage = async () => {
  const [rarities, categories, products] = await Promise.all([
    prisma.product.groupBy({
      by: ["rarity"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["category"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ rarity: "asc" }, { title: "asc" }],
      take: 32,
      include: {
        sellerShop: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const rarityCounts = new Map(rarities.map((item) => [item.rarity, item._count._all]));

  return (
    <StorefrontPageLayout title="คอลเลกชัน" description="ภาพรวมการ์ดที่มีในตลาด แยกตาม RARITY และ SET เพื่อช่วยวางแผนสะสมหรือค้นหาการ์ดที่ยังขาด">
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>ครบทุก RARITY</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {rarityOrder.map((rarity) => (
                <div key={rarity} className="rounded-md border bg-background p-3">
                  <Badge>{rarity}</Badge>
                  <strong className="mt-2 block text-xl">{(rarityCounts.get(rarity) ?? 0).toLocaleString("th-TH")}</strong>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ตาม SET</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {categories.map((category) => (
                <div key={category.category} className="flex items-center justify-between rounded-md bg-muted p-3">
                  <strong>{category.category}</strong>
                  <span className="text-muted-foreground">{category._count._all.toLocaleString("th-TH")} ใบ</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>การ์ดในตลาด</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product, index) => (
              <div key={product.id} className="rounded-md border bg-background p-3">
                <div className={`product-art object-pos-${(index % 3) + 1} mb-3 aspect-[4/3] rounded-md bg-muted`} />
                <Badge variant="outline">{product.rarity}</Badge>
                <strong className="mt-2 block">{product.title}</strong>
                <span className="text-sm text-muted-foreground">{product.sellerShop.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </StorefrontPageLayout>
  );
};

export default CollectionPage;
