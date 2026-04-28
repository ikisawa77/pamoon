import Link from "next/link";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";

const SellerRegisterPage = () => (
  <StorefrontPageLayout title="สมัครร้านค้า" description="ส่งคำขอเปิดร้านเพื่อเริ่มลงขายสินค้าและเปิดประมูลการ์ด">
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store />
          ข้อมูลร้านค้า
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input placeholder="ชื่อร้านค้า" />
        <Input placeholder="ช่องทางติดต่อ" />
        <Input placeholder="บัญชีรับเงิน / PromptPay" />
        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          <Badge className="mb-2">รอต่อ API</Badge>
          <p>ตอนนี้หน้าแรกแยกเมนูสมาชิกกับร้านค้าแล้ว ขั้นต่อไปจะบันทึกคำขอร้านค้าและให้ admin อนุมัติจากหลังบ้าน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button">ส่งคำขอสมัครร้านค้า</Button>
          <Button asChild variant="outline">
            <Link href="/shops">ดูตลาดร้านค้า</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </StorefrontPageLayout>
);

export default SellerRegisterPage;
