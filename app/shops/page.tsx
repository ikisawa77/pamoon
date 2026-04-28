import Link from "next/link";
import { Package, Star, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const ShopsPage = async () => {
  const shops = await prisma.shop.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      owner: {
        select: {
          displayName: true,
          email: true,
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

  return (
    <StorefrontPageLayout title="ตลาดร้านค้า" description="รวมร้านค้าที่สมัครและลงขายการ์ดในระบบ ใช้ตรวจสอบสินค้า คะแนนร้าน และจำนวนรายการที่เปิดขายอยู่">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shops.map((shop) => (
          <Card key={shop.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{shop.name}</CardTitle>
                  <CardDescription className="truncate">{shop.owner.displayName} · {shop.owner.email}</CardDescription>
                </div>
                <Badge variant={shop.status === "APPROVED" ? "default" : "secondary"}>{shop.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <span className="rounded-md bg-muted p-3">
                  <Store className="mb-2" />
                  <strong className="block">{shop.slug}</strong>
                  <span className="text-muted-foreground">รหัสร้าน</span>
                </span>
                <span className="rounded-md bg-muted p-3">
                  <Package className="mb-2" />
                  <strong className="block">{shop._count.products.toLocaleString("th-TH")}</strong>
                  <span className="text-muted-foreground">สินค้า</span>
                </span>
                <span className="rounded-md bg-muted p-3">
                  <Star className="mb-2" />
                  <strong className="block">{shop.rating.toFixed(1)}</strong>
                  <span className="text-muted-foreground">{shop.reviewCount} รีวิว</span>
                </span>
              </div>
              <Button asChild variant="outline">
                <Link href={`/shops/${shop.slug}`}>ดูหน้าร้าน</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </StorefrontPageLayout>
  );
};

export default ShopsPage;
