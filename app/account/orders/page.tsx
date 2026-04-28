import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderActions } from "@/components/shared/OrderActions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })
    .format(value / 100)
    .replace("THB", "฿");

const formatDate = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(value)
    : "-";

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระแล้ว/รอจัดส่ง",
  SHIPPED: "จัดส่งแล้ว",
  COMPLETED: "สำเร็จ",
  CANCELLED: "ยกเลิก",
  DISPUTED: "มีข้อพิพาท",
  PAYMENT_EXPIRED: "หมดเวลาชำระ",
  REFUND_PENDING: "รอคืนเงิน",
  REFUNDED: "คืนเงินแล้ว",
};

const OrdersPage = async () => {
  const user = await getCurrentUser();
  const shopId = user?.shops[0]?.id;
  const orders = user
    ? await prisma.order.findMany({
        where: {
          OR: [{ buyerId: user.id }, ...(shopId ? [{ sellerShopId: shopId }] : [])],
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
          buyer: { select: { id: true, displayName: true } },
          sellerShop: { select: { id: true, name: true, ownerId: true } },
          product: { select: { title: true, mode: true } },
          chatThread: { select: { id: true, status: true } },
        },
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">รายการคำสั่งซื้อ</h1>
        <p className="text-sm text-muted-foreground">
          ติดตามสถานะชำระเงิน, escrow, กำหนดจัดส่ง 48 ชม., การขยายเวลาส่ง และการคืนเงินตาม SLA
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>คำสั่งซื้อและประมูลล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orders.length === 0 ? (
            <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
              ยังไม่มีคำสั่งซื้อในระบบ
            </div>
          ) : (
            orders.map((order) => {
              const isBuyer = order.buyerId === user?.id;
              const isSeller = order.sellerShop.ownerId === user?.id;
              const canPay = isBuyer && order.status === "PENDING_PAYMENT";
              const canShip = isSeller && order.status === "PAID";
              const canExtendShipping = isSeller && order.status === "PAID" && order.shippingExtensionCount < 1;

              return (
                <div key={order.id} className="grid gap-4 rounded-md border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block">{order.product.title}</strong>
                      <span className="text-sm text-muted-foreground">
                        {order.source === "AUCTION" ? "ชนะประมูล" : "ซื้อทันที"} · {order.sellerShop.name} · ผู้ซื้อ {order.buyer.displayName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{statusLabel[order.status] ?? order.status}</Badge>
                      <strong>{moneyFromCents(order.amountCents)}</strong>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-4">
                    <div>
                      <span className="block text-muted-foreground">ครบกำหนดชำระ</span>
                      <strong>{formatDate(order.paymentDueAt)}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">ชำระเมื่อ</span>
                      <strong>{formatDate(order.paidAt)}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">ต้องจัดส่งก่อน</span>
                      <strong>{formatDate(order.shipDueAt)}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-foreground">เลขพัสดุ</span>
                      <strong>{order.trackingNumber ?? "-"}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.chatThread?.status === "ACTIVE" ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/account/chat">เปิดแชท</Link>
                      </Button>
                    ) : null}
                    <OrderActions
                      orderId={order.id}
                      canPay={canPay}
                      canShip={canShip}
                      canExtendShipping={canExtendShipping}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
