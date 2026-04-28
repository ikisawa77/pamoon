import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })
    .format(value / 100)
    .replace("THB", "฿");

const OrdersPage = async () => {
  const products = await prisma.product.findMany({
    where: { mode: "BUY", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { sellerShop: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">รายการคำสั่งซื้อ</h1>
        <p className="text-sm text-muted-foreground">ตัวอย่างออเดอร์จากสินค้าซื้อเลย รอเชื่อม checkout และสถานะจัดส่งจริง</p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>คำสั่งซื้อล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {products.map((product, index) => (
            <div key={product.id} className="grid gap-3 rounded-md border bg-background p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <strong className="block">{product.title}</strong>
                <span className="text-sm text-muted-foreground">{product.sellerShop.name}</span>
              </div>
              <Badge variant={index % 2 === 0 ? "default" : "secondary"}>{index % 2 === 0 ? "รอชำระเงิน" : "รอจัดส่ง"}</Badge>
              <div className="flex items-center gap-3">
                <strong>{moneyFromCents(product.currentPriceCents)}</strong>
                <Button type="button" variant="outline" size="sm">รายละเอียด</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
