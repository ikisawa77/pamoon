import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const roleLabel = (role: string) => {
  if (role === "ADMIN") {
    return "ผู้ดูแลระบบ";
  }

  if (role === "RESELLER") {
    return "Reseller";
  }

  return "สมาชิก";
};

const AccountPage = async () => {
  const profile = await getCurrentUser();

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <section>
          <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
          <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อจัดการบัญชี คำสั่งซื้อ การประมูล และร้านค้าของคุณ</p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>กรุณาเข้าสู่ระบบ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">สมัครสมาชิก</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sellerCta = profile.role === "MEMBER" ? "สมัคร Reseller" : "จัดการร้านค้า";

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
        <p className="text-sm text-muted-foreground">จัดการข้อมูลบัญชี สถานะสมาชิก และยอดเงินสำหรับการซื้อขาย</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{profile.displayName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
              <span className="text-muted-foreground">{roleLabel(profile.role)}</span>
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
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/account/addresses">จัดการที่อยู่</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/seller">{sellerCta}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;
