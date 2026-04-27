import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const statusLabel: Record<string, string> = {
  ACTIVE: "ใช้งานอยู่",
  PENDING: "รอตรวจ",
  APPROVED: "อนุมัติแล้ว",
  SOLD: "ขายแล้ว",
  ENDED: "จบแล้ว",
  REMOVED: "ถอดออก",
  DRAFT: "แบบร่าง",
};

const AdminPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    userCount,
    shopCount,
    productCount,
    auctionCount,
    orderCount,
    walletCount,
    latestShops,
    latestProducts,
    latestTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shop.count(),
    prisma.product.count(),
    prisma.product.count({ where: { mode: "AUCTION" } }),
    prisma.order.count(),
    prisma.walletTransaction.count(),
    prisma.shop.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        owner: {
          select: {
            email: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        sellerShop: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.walletTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
  ]);

  const statCards = [
    { label: "สมาชิก", value: userCount.toLocaleString("th-TH"), detail: "บัญชีทั้งหมด" },
    { label: "ร้านค้า", value: shopCount.toLocaleString("th-TH"), detail: "ร้านที่สมัครแล้ว" },
    { label: "สินค้า", value: productCount.toLocaleString("th-TH"), detail: "รวมซื้อเลยและประมูล" },
    { label: "ประมูล", value: auctionCount.toLocaleString("th-TH"), detail: "รายการประมูลทั้งหมด" },
    { label: "คำสั่งซื้อ", value: orderCount.toLocaleString("th-TH"), detail: "ออเดอร์ในระบบ" },
    { label: "ธุรกรรมเงิน", value: walletCount.toLocaleString("th-TH"), detail: "รายการกระเป๋าเงิน" },
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Pamoon Admin</p>
            <h1 className="text-2xl font-bold">แดชบอร์ดหลังบ้าน</h1>
            <p className="text-sm text-muted-foreground">เข้าสู่ระบบโดย {user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{card.detail}</CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>ร้านค้าล่าสุด</CardTitle>
              <CardDescription>สถานะร้านและจำนวนสินค้าที่ลงขาย</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {latestShops.map((shop) => (
                <div key={shop.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <strong className="block truncate">{shop.name}</strong>
                    <span className="block truncate text-sm text-muted-foreground">{shop.owner.email}</span>
                    <span className="text-sm text-muted-foreground">สินค้า {shop._count.products.toLocaleString("th-TH")} รายการ</span>
                  </div>
                  <Badge variant={shop.status === "APPROVED" ? "default" : "secondary"}>
                    {statusLabel[shop.status] ?? shop.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>สินค้าล่าสุด</CardTitle>
              <CardDescription>รายการที่ร้านค้าลงขายและลงประมูล</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">สินค้า</th>
                    <th className="py-2 font-medium">ร้านค้า</th>
                    <th className="py-2 font-medium">ประเภท</th>
                    <th className="py-2 font-medium">Rarity</th>
                    <th className="py-2 font-medium">ราคา</th>
                    <th className="py-2 font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {latestProducts.map((product) => (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <td className="py-3 font-medium">{product.title}</td>
                      <td className="py-3 text-muted-foreground">{product.sellerShop.name}</td>
                      <td className="py-3">{product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}</td>
                      <td className="py-3">{product.rarity}</td>
                      <td className="py-3">{moneyFromCents(product.currentPriceCents)}</td>
                      <td className="py-3">
                        <Badge variant="outline">{statusLabel[product.status] ?? product.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ธุรกรรมกระเป๋าเงินล่าสุด</CardTitle>
            <CardDescription>ใช้ตรวจสอบการเติมเงิน วงเงินประมูล และรายการเงินในระบบ</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {latestTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-md border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate">{transaction.user.email}</strong>
                    <span className="text-sm text-muted-foreground">{transaction.type}</span>
                  </div>
                  <Badge variant={transaction.status === "COMPLETED" ? "default" : "secondary"}>
                    {transaction.status}
                  </Badge>
                </div>
                <p className="mt-3 text-xl font-semibold">{moneyFromCents(transaction.amountCents)}</p>
                {transaction.note ? <p className="mt-1 text-sm text-muted-foreground">{transaction.note}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default AdminPage;
