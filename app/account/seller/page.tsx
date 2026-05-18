import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

const SellerAccountPage = async () => {
  const user = await getCurrentUser();
  const shop = user?.shops[0];
  const isReseller = user?.role === "RESELLER" || user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">Reseller Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          พื้นที่จัดการสิทธิ์ลงขายสินค้า เปิดประมูล และติดตามสถานะร้านค้าของคุณ
        </p>
      </section>

      {shop ? (
        <Card>
          <CardHeader>
            <CardTitle>ร้านค้าของคุณ</CardTitle>
            <CardDescription>บัญชีนี้พร้อมใช้สำหรับลงสินค้าใน marketplace แล้ว</CardDescription>
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
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/auctions">ลงสินค้า / เปิดประมูล</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/shops">ดูตลาด Reseller</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{isReseller ? "ยังไม่พบร้านค้า" : "สมัครเป็น Reseller"}</CardTitle>
            <CardDescription>
              สมัครผ่านหน้า Register แล้วระบบจะสร้างร้านค้าให้พร้อมใช้งานทันทีในช่วงพัฒนา
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input disabled placeholder="ชื่อร้านค้า" />
            <Input disabled placeholder="ช่องทางติดต่อ" />
            <Input disabled placeholder="บัญชีรับเงิน / PromptPay" />
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              ฟอร์มสมัครร้านค้าเดิมถูกแทนด้วยระบบ Register แบบเลือก role Reseller เพื่อให้สร้างบัญชีและร้านค้าได้จริงในขั้นตอนเดียว
            </div>
            <Button asChild>
              <Link href="/register">สมัครบัญชี Reseller</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SellerAccountPage;
