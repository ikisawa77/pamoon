import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })
    .format(value / 100)
    .replace("THB", "฿");

const MyAuctionsPage = async () => {
  const user = await getCurrentUser();
  const bids = user
    ? await prisma.bid.findMany({
        where: { bidderId: user.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          product: {
            include: {
              sellerShop: { select: { name: true } },
            },
          },
        },
      })
    : [];
  const fallbackProducts = bids.length
    ? []
    : await prisma.product.findMany({
        where: { mode: "AUCTION", status: "ACTIVE" },
        orderBy: { currentPriceCents: "desc" },
        take: 6,
        include: { sellerShop: { select: { name: true } } },
      });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">การประมูลของฉัน</h1>
        <p className="text-sm text-muted-foreground">ติดตามรายการที่เสนอราคา สถานะนำอยู่ และราคาปัจจุบัน</p>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {bids.map((bid) => (
          <Card key={bid.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{bid.product.title}</CardTitle>
                <Badge>{bid.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">{bid.product.sellerShop.name}</span>
              <strong>ราคาที่เสนอ {moneyFromCents(bid.amountCents)}</strong>
              <span>ราคาปัจจุบัน {moneyFromCents(bid.product.currentPriceCents)}</span>
            </CardContent>
          </Card>
        ))}
        {fallbackProducts.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <span className="text-sm text-muted-foreground">{product.sellerShop.name}</span>
              <strong>{moneyFromCents(product.currentPriceCents)}</strong>
              <Button asChild variant="outline">
                <Link href="/auctions">เริ่มเสนอราคา</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyAuctionsPage;
