import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const NotificationsPage = async () => {
  const [products, transactions] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        sellerShop: {
          select: { name: true },
        },
      },
    }),
    prisma.walletTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: { email: true },
        },
      },
    }),
  ]);

  return (
    <StorefrontPageLayout title="แจ้งเตือน" description="รวมความเคลื่อนไหวล่าสุดจากสินค้าและธุรกรรมในระบบ">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell />
            รายการล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-md border bg-background p-4">
              <Badge>{product.mode === "AUCTION" ? "ประมูลใหม่" : "ซื้อเลยใหม่"}</Badge>
              <strong className="mt-2 block">{product.title}</strong>
              <span className="text-sm text-muted-foreground">{product.sellerShop.name}</span>
            </div>
          ))}
          {transactions.map((transaction) => (
            <div key={transaction.id} className="rounded-md border bg-background p-4">
              <Badge variant="outline">{transaction.status}</Badge>
              <strong className="mt-2 block">{transaction.type}</strong>
              <span className="text-sm text-muted-foreground">{transaction.user.email}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </StorefrontPageLayout>
  );
};

export default NotificationsPage;
