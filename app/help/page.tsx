import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";

const faqs = [
  {
    question: "ประมูลทำงานอย่างไร",
    answer: "ระบบจะแสดงราคาปัจจุบันและราคาขั้นต่ำถัดไป ผู้ใช้กดเสนอราคาแล้ว API จะบันทึก bid และอัปเดตราคาสินค้าจากฐานข้อมูลจริง",
  },
  {
    question: "เติมเงินใช้ส่วนไหน",
    answer: "หน้าแรกและกระเป๋าเงินผูกกับ wallet transaction แล้ว ขั้นต่อไปจะต่อ payment provider จริงและ webhook สำหรับยืนยันยอด",
  },
  {
    question: "ร้านค้าลงสินค้าได้ไหม",
    answer: "ปุ่มลงสินค้าในหน้าแรกยิง API สร้างสินค้าเข้าร้านตัวอย่างแล้ว และ admin dashboard ตรวจสอบรายการที่ลงใหม่ได้",
  },
  {
    question: "ข้อมูลตัวอย่างมาจากไหน",
    answer: "ฐานข้อมูล seed มีร้านค้า 3 ร้าน สินค้าซื้อเลย 80 ใบ และประมูล 80 ใบ ครบ RARITY C, UC, R, L, SR, SEC, SP, P",
  },
];

const HelpPage = () => (
  <StorefrontPageLayout title="ช่วยเหลือ" description="คำตอบสำหรับการทดสอบระบบประมูล ซื้อเลย เติมเงิน ร้านค้า และหลังบ้าน">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleHelp />
            คำถามที่พบบ่อย
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-md border bg-background p-4">
              <strong className="block">{faq.question}</strong>
              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>ทางลัดทดสอบ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <Link href="/auctions">ไปหน้าประมูล</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/buy-now">ไปหน้าซื้อเลย</Link>
          </Button>
          <Button asChild>
            <Link href="/account">ไปบัญชีของฉัน</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  </StorefrontPageLayout>
);

export default HelpPage;
