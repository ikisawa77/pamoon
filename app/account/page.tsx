import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const AccountPage = async () => {
  const signedInUser = await getCurrentUser();
  const demoMember = signedInUser
    ? null
    : await prisma.user.findFirst({
        where: { role: "MEMBER" },
        orderBy: { createdAt: "asc" },
        select: {
          email: true,
          displayName: true,
          role: true,
          status: true,
          walletBalanceCents: true,
          bidLimitCents: true,
          createdAt: true,
        },
      });
  const profile = signedInUser ?? demoMember;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
        <p className="text-sm text-muted-foreground">จัดการข้อมูลบัญชี สถานะสมาชิก และยอดเงินสำหรับการซื้อขาย</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{profile?.displayName ?? "ยังไม่ได้เข้าสู่ระบบ"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profile ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <span className="rounded-md bg-muted p-3">
                  <strong className="block">อีเมล</strong>
                  <span className="text-muted-foreground">{profile.email}</span>
                </span>
                <span className="rounded-md bg-muted p-3">
                  <strong className="block">สถานะ</strong>
                  <Badge>{profile.status}</Badge>
                </span>
                <span className="rounded-md bg-muted p-3">
                  <strong className="block">บทบาท</strong>
                  <span className="text-muted-foreground">{profile.role}</span>
                </span>
                <span className="rounded-md bg-muted p-3">
                  <strong className="block">วงเงินประมูล</strong>
                  <span className="text-muted-foreground">{moneyFromCents(profile.bidLimitCents)}</span>
                </span>
              </div>
              <div className="rounded-md border p-4">
                <span className="text-sm text-muted-foreground">ยอดเงินคงเหลือ</span>
                <strong className="block text-3xl">{moneyFromCents(profile.walletBalanceCents)}</strong>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลสมาชิกในฐานข้อมูล</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/account/addresses">จัดการที่อยู่</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/seller">สมัครร้านค้า</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
