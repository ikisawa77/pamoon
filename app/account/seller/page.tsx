import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SellerApplicationWizard, type SellerShopSnapshot } from "@/components/shared/SellerApplicationWizard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const SellerAccountPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>กรุณาเข้าสู่ระบบ</CardTitle>
          <CardDescription>ต้องมีบัญชีสมาชิกก่อนจึงจะสมัครเปิดร้านค้าได้</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const shop = await prisma.shop.findFirst({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      description: true,
      hasPhysicalStore: true,
      logoUrl: true,
      applicantFirstName: true,
      applicantLastName: true,
      phone: true,
      phoneVerifiedAt: true,
      bankName: true,
      bankBranch: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankBookImageUrl: true,
      addressLine: true,
      subdistrict: true,
      district: true,
      province: true,
      postalCode: true,
      rejectionReason: true,
      reviewedAt: true,
    },
  });

  const shopSnapshot: SellerShopSnapshot | null = shop
    ? {
        ...shop,
        phoneVerifiedAt: shop.phoneVerifiedAt?.toISOString() ?? null,
        reviewedAt: shop.reviewedAt?.toISOString() ?? null,
      }
    : null;

  if (user.role === "ADMIN" && shopSnapshot?.status === "APPROVED") {
    return (
      <div className="grid gap-6">
        <section>
          <h1 className="text-2xl font-bold">ร้านค้าทดสอบของผู้ดูแล</h1>
          <p className="text-sm text-muted-foreground">บัญชีผู้ดูแลสามารถใช้ร้านทดสอบสำหรับลงสินค้า ซื้อสินค้า และประมูลได้โดยตรง</p>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>{shopSnapshot.name}</CardTitle>
            <CardDescription>ใช้สำหรับทดสอบ flow marketplace แบบครบระบบ</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge>{shopSnapshot.status}</Badge>
            <Button asChild>
              <Link href={`/shops/${shopSnapshot.slug}`}>เปิดหน้าร้าน</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">เปิดหลังบ้าน</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (shopSnapshot?.status === "APPROVED") {
    return (
      <div className="grid gap-6">
        <section>
          <h1 className="text-2xl font-bold">จัดการร้านค้า</h1>
          <p className="text-sm text-muted-foreground">ร้านค้าของคุณผ่านการอนุมัติแล้ว สามารถลงขายสินค้าและเปิดประมูลได้</p>
        </section>
        <Card>
          <CardHeader>
            <CardTitle>{shopSnapshot.name}</CardTitle>
            <CardDescription>{shopSnapshot.description ?? "ร้านค้าที่ผ่านการตรวจสอบจากผู้ดูแลระบบ"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoBox label="สถานะ" value={shopSnapshot.status} />
              <InfoBox label="เบอร์โทร" value={shopSnapshot.phone ?? "-"} />
              <InfoBox label="บัญชีรับเงิน" value={shopSnapshot.bankAccountName ?? "-"} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/shops/${shopSnapshot.slug}`}>ไปหน้าร้าน</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/shops/${shopSnapshot.slug}#shop-auctions`}>จัดการประมูล</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/shops/${shopSnapshot.slug}#shop-buy-now`}>จัดการสินค้าขายทันที</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-2xl font-bold">สมัครเปิดร้านค้า</h1>
        <p className="text-sm text-muted-foreground">
          สมัครสมาชิกทั่วไปก่อน จากนั้นยืนยันเบอร์โทรศัพท์ กรอกข้อมูลร้าน บัญชีธนาคาร และที่อยู่ เพื่อให้ผู้ดูแลอนุมัติร้านค้า
        </p>
      </section>
      <SellerApplicationWizard userEmail={user.email} displayName={user.displayName} initialShop={shopSnapshot} />
    </div>
  );
};

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-background/50 p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold">{value}</p>
  </div>
);

export default SellerAccountPage;
