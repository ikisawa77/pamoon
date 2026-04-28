import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";

const RegisterPage = () => (
  <StorefrontPageLayout title="สมัครสมาชิก" description="หน้าทดสอบสถานะผู้ใช้ก่อนเป็นสมาชิก สำหรับ flow ถัดไปจะเชื่อม API สมัครสมาชิกและยืนยันอีเมล">
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>สร้างบัญชีสมาชิก</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input placeholder="ชื่อที่แสดง" />
        <Input placeholder="อีเมล" type="email" />
        <Input placeholder="รหัสผ่าน" type="password" />
        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          <Badge className="mb-2">กำลังพัฒนา</Badge>
          <p>ตอนนี้ใช้บัญชี demo ใน seed เพื่อทดสอบเมนูสมาชิกก่อน แล้วค่อยต่อ API สมัครสมาชิกจริงในรอบถัดไป</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/seller/register">สมัครร้านค้า</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </StorefrontPageLayout>
);

export default RegisterPage;
