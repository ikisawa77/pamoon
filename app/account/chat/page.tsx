import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const conversations = [
  {
    id: "chat-1",
    shop: "CardHunter Shop",
    lastMessage: "การ์ดพร้อมจัดส่งหลังยืนยันชำระเงินครับ",
    time: "10:24",
    unread: 2,
  },
  {
    id: "chat-2",
    shop: "Grand Line Cards",
    lastMessage: "ขอบคุณที่เสนอราคาครับ",
    time: "เมื่อวาน",
    unread: 0,
  },
  {
    id: "chat-3",
    shop: "Romance Dawn Vault",
    lastMessage: "มีรูปมุมการ์ดเพิ่มเติมให้ตรวจสอบแล้ว",
    time: "2 วันก่อน",
    unread: 1,
  },
];

const ChatPage = () => (
  <div className="flex flex-col gap-6">
    <section>
      <h1 className="text-2xl font-bold">แชท</h1>
      <p className="text-sm text-muted-foreground">ตัวอย่างหน้าสนทนาระหว่างสมาชิกกับร้านค้า สำหรับต่อ realtime chat ในรอบถัดไป</p>
    </section>
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>ห้องสนทนา</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {conversations.map((conversation) => (
            <button key={conversation.id} className="rounded-md border bg-background p-3 text-left transition hover:bg-muted">
              <div className="flex items-center justify-between gap-3">
                <strong>{conversation.shop}</strong>
                <span className="text-xs text-muted-foreground">{conversation.time}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{conversation.lastMessage}</p>
              {conversation.unread > 0 ? <Badge className="mt-2">{conversation.unread} ใหม่</Badge> : null}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>CardHunter Shop</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[420px] flex-col gap-4">
          <div className="flex flex-1 flex-col gap-3 rounded-md bg-muted p-4">
            <p className="max-w-[80%] rounded-md bg-background p-3 text-sm">สวัสดีครับ สนใจการ์ดใบนี้ยังมีอยู่ไหม</p>
            <p className="ml-auto max-w-[80%] rounded-md bg-primary p-3 text-sm text-primary-foreground">ยังมีครับ การ์ด Near Mint พร้อมจัดส่ง</p>
            <p className="max-w-[80%] rounded-md bg-background p-3 text-sm">ขอดูรูปมุมการ์ดเพิ่มได้ไหมครับ</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="พิมพ์ข้อความ..." />
            <Button type="button">ส่ง</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default ChatPage;
