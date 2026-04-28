import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const addresses = [
  {
    id: "addr-1",
    name: "CardHunter",
    phone: "080-000-0001",
    address: "99/9 ถนนตัวอย่าง แขวงการ์ด เขตสะสม กรุงเทพฯ 10110",
    default: true,
  },
  {
    id: "addr-2",
    name: "ที่ทำงาน",
    phone: "080-000-0002",
    address: "อาคารทดสอบ ชั้น 12 ถนนตลาดการ์ด กรุงเทพฯ 10310",
    default: false,
  },
];

const AddressesPage = () => (
  <div className="flex flex-col gap-6">
    <section>
      <h1 className="text-2xl font-bold">ที่อยู่จัดส่งสินค้า</h1>
      <p className="text-sm text-muted-foreground">ตัวอย่างสมุดที่อยู่สำหรับใช้ตอน checkout และจัดส่งสินค้าหลังชำระเงิน</p>
    </section>
    <div className="grid gap-4 xl:grid-cols-2">
      {addresses.map((address) => (
        <Card key={address.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>{address.name}</CardTitle>
              {address.default ? <Badge>ค่าเริ่มต้น</Badge> : <Badge variant="outline">สำรอง</Badge>}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{address.phone}</p>
            <p>{address.address}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline">แก้ไข</Button>
              <Button type="button" variant="secondary">ตั้งเป็นค่าเริ่มต้น</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default AddressesPage;
