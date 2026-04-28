import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const WalletPage = async () => {
  const currentUser = await getCurrentUser();
  const user = currentUser
    ? await prisma.user.findUnique({
        where: { id: currentUser.id },
        include: {
          walletTransactions: {
            orderBy: { createdAt: "desc" },
            take: 12,
          },
        },
      })
    : null;

  return (
    <StorefrontPageLayout title="กระเป๋าเงิน" description="ดูยอดเงิน วงเงินประมูล และประวัติธุรกรรมจากฐานข้อมูลจริง">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="wallet-visual wallet-card-shadow border-0 text-wallet-foreground">
          <CardHeader>
            <CardTitle>ยอดเงินคงเหลือ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <strong className="text-4xl">{moneyFromCents(user?.walletBalanceCents ?? 0)}</strong>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span>วงเงินประมูล <strong className="block">{moneyFromCents(user?.bidLimitCents ?? 0)}</strong></span>
              <span>รอชำระ <strong className="block">{moneyFromCents(32000)}</strong></span>
            </div>
            <Button type="button" className="bg-background text-foreground hover:bg-background/90">
              เติมเงิน
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ประวัติการเงิน</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(user?.walletTransactions ?? []).length === 0 ? (
              <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
                ยังไม่มีรายการธุรกรรม
              </div>
            ) : (
              (user?.walletTransactions ?? []).map((transaction) => (
                <div key={transaction.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <strong className="block">{transaction.type}</strong>
                    <span className="text-sm text-muted-foreground">{transaction.note ?? transaction.referenceType ?? "รายการระบบ"}</span>
                  </div>
                  <div className="text-right">
                    <strong className="block">{moneyFromCents(transaction.amountCents)}</strong>
                    <Badge variant={transaction.status === "COMPLETED" ? "default" : "secondary"}>{transaction.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </StorefrontPageLayout>
  );
};

export default WalletPage;
