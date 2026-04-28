import Link from "next/link";
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
    <StorefrontPageLayout title="บัญชีผู้ใช้" description="ศูนย์รวมข้อมูลสมาชิก ร้านค้า และสิทธิ์การใช้งานของบัญชีที่กำลังทดสอบ">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{profile?.displayName ?? "ยังไม่ได้เข้าสู่ระบบ"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profile ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
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
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">ไปหลังบ้าน</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </StorefrontPageLayout>
  );
};

export default AccountPage;
