import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const wantedItems = [
  { id: "wanted-1", title: "Nami (SP)", budget: "฿6,500", status: "รอร้านค้าเสนอขาย" },
  { id: "wanted-2", title: "Monkey D. Luffy (SEC)", budget: "฿4,200", status: "มีข้อเสนอ 2 ร้าน" },
  { id: "wanted-3", title: "Roronoa Zoro (SR)", budget: "฿1,800", status: "กำลังค้นหา" },
];

const WantedPage = () => (
  <div className="flex flex-col gap-6">
    <section>
      <h1 className="text-2xl font-bold">รายการตั้งรับ</h1>
      <p className="text-sm text-muted-foreground">ตัวอย่างรายการที่สมาชิกประกาศรับซื้อ พร้อมงบประมาณและสถานะข้อเสนอ</p>
    </section>
    <div className="grid gap-4 lg:grid-cols-3">
      {wantedItems.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <span className="text-sm text-muted-foreground">งบประมาณ</span>
            <strong className="text-2xl">{item.budget}</strong>
            <Badge variant="outline">{item.status}</Badge>
            <Button type="button" variant="outline">แก้ไขรายการ</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default WantedPage;
