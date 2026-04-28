import Link from "next/link";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })
    .format(value / 100)
    .replace("THB", "฿");

const FavoritesPage = async () => {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ watcherCount: "desc" }, { createdAt: "desc" }],
    take: 12,
    include: { sellerShop: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">รายการที่ถูกใจ</h1>
        <p className="text-sm text-muted-foreground">ตัวอย่างรายการติดตาม ใช้จากสินค้าที่มี watcher สูงในตลาด</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product, index) => (
          <Card key={product.id} className="overflow-hidden p-0">
            <div className={`product-art object-pos-${(index % 3) + 1} aspect-[4/3] bg-muted`} />
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{product.title}</CardTitle>
                <Heart className="text-primary" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{product.rarity}</Badge>
                <strong>{moneyFromCents(product.currentPriceCents)}</strong>
              </div>
              <span className="text-sm text-muted-foreground">{product.sellerShop.name}</span>
              <Button asChild variant="outline">
                <Link href={product.mode === "AUCTION" ? "/auctions" : "/buy-now"}>ไปยังรายการ</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;
