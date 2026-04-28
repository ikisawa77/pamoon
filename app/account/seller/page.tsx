import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

const SellerAccountPage = async () => {
  const user = await getCurrentUser();
  const shop = user?.shops[0];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">สมัครร้านค้า</h1>
        <p className="text-sm text-muted-foreground">เปิดสิทธิ์ลงขายสินค้าและตั้งประมูลภายใต้บัญชีสมาชิกของคุณ</p>
      </section>
      {shop ? (
        <Card>
          <CardHeader>
            <CardTitle>ร้านค้าของคุณ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <span className="rounded-md bg-muted p-3">
                <strong className="block">รหัสร้าน</strong>
                <span className="text-muted-foreground">{shop.slug}</span>
              </span>
              <span className="rounded-md bg-muted p-3">
                <strong className="block">สถานะ</strong>
                <Badge>{shop.status}</Badge>
              </span>
              <span className="rounded-md bg-muted p-3">
                <strong className="block">สิทธิ์ลงสินค้า</strong>
                <span className="text-muted-foreground">{shop.status === "APPROVED" ? "เปิดใช้งาน" : "รอตรวจสอบ"}</span>
              </span>
            </div>
            <Button asChild>
              <Link href="/shops">ดูตลาดร้านค้า</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลสมัครร้านค้า</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input placeholder="ชื่อร้านค้า" />
            <Input placeholder="ช่องทางติดต่อ" />
            <Input placeholder="บัญชีรับเงิน / PromptPay" />
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              ตัวอย่างฟอร์มสมัครร้านค้า รอบถัดไปจะบันทึกคำขอและส่งให้ admin อนุมัติในหลังบ้าน
            </div>
            <Button type="button">ส่งคำขอสมัครร้านค้า</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SellerAccountPage;
