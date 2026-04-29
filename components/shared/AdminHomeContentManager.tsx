"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/shared/RichTextEditor";

interface AdminHomeContentItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  href: string | null;
  imageUrl: string | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface AdminHomeContentManagerProps {
  contents: AdminHomeContentItem[];
}

const typeLabel: Record<string, string> = {
  SLIDE: "สไลด์",
  PROMOTION: "โปรโมชั่น",
  ARTICLE: "บทความ",
  FEATURED_SHOP: "ร้านค้าแนะนำ",
};

const AdminHomeContentManager = ({ contents }: AdminHomeContentManagerProps) => {
  const [items, setItems] = useState(contents);
  const [message, setMessage] = useState("");
  const [newArticle, setNewArticle] = useState({
    title: "",
    subtitle: "",
    body: "<p>เริ่มเขียนบทความ...</p>",
    href: "/help",
    imageUrl: "/assets/trading-card-products.png",
    badge: "Article",
    sortOrder: contents.length + 1,
  });

  const updateItem = (id: string, patch: Partial<AdminHomeContentItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const saveItem = async (item: AdminHomeContentItem) => {
    setMessage("");
    const response = await fetch(`/api/admin/home-content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        subtitle: item.subtitle ?? "",
        body: item.body ?? "",
        href: item.href ?? "",
        imageUrl: item.imageUrl ?? "",
        badge: item.badge ?? "",
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      }),
    });
    const result = (await response.json()) as { ok: boolean; error?: { message: string } };
    setMessage(response.ok && result.ok ? "บันทึกเนื้อหาหน้าแรกแล้ว" : result.error?.message ?? "บันทึกไม่สำเร็จ");
  };

  const createArticle = async () => {
    setMessage("");
    const response = await fetch("/api/admin/home-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ARTICLE",
        title: newArticle.title,
        subtitle: newArticle.subtitle,
        body: newArticle.body,
        href: newArticle.href,
        imageUrl: newArticle.imageUrl,
        badge: newArticle.badge,
        sortOrder: newArticle.sortOrder,
        isActive: true,
      }),
    });
    const result = (await response.json()) as { ok: boolean; content?: AdminHomeContentItem; error?: { message: string } };

    if (!response.ok || !result.ok || !result.content) {
      setMessage(result.error?.message ?? "เพิ่มบทความไม่สำเร็จ");
      return;
    }

    setItems((current) => [...current, result.content as AdminHomeContentItem]);
    setNewArticle({
      title: "",
      subtitle: "",
      body: "<p>เริ่มเขียนบทความ...</p>",
      href: "/help",
      imageUrl: "/assets/trading-card-products.png",
      badge: "Article",
      sortOrder: newArticle.sortOrder + 1,
    });
    setMessage("เพิ่มบทความใหม่แล้ว");
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>เขียนบทความใหม่</CardTitle>
          <CardDescription>สร้างบทความ Rich Text เพื่อแสดงในส่วน “บทความที่น่าสนใจ” บนหน้าแรก</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={newArticle.title} onChange={(event) => setNewArticle((current) => ({ ...current, title: event.target.value }))} placeholder="หัวข้อบทความ" />
            <Input value={newArticle.subtitle} onChange={(event) => setNewArticle((current) => ({ ...current, subtitle: event.target.value }))} placeholder="คำอธิบายสั้น" />
            <Input value={newArticle.href} onChange={(event) => setNewArticle((current) => ({ ...current, href: event.target.value }))} placeholder="/help" />
            <Input value={newArticle.imageUrl} onChange={(event) => setNewArticle((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="/assets/trading-card-products.png" />
            <Input value={newArticle.badge} onChange={(event) => setNewArticle((current) => ({ ...current, badge: event.target.value }))} placeholder="Badge" />
            <Input type="number" value={newArticle.sortOrder} onChange={(event) => setNewArticle((current) => ({ ...current, sortOrder: Number(event.target.value) }))} placeholder="ลำดับ" />
          </div>
          <RichTextEditor value={newArticle.body} onChange={(value) => setNewArticle((current) => ({ ...current, body: value }))} />
          <Button type="button" onClick={createArticle}>
            <Save data-icon="inline-start" />
            เพิ่มบทความ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>จัดการหน้าแรกและบทความ</CardTitle>
          <CardDescription>บทความใช้ Rich Text ได้ และจะแสดงในส่วน “บทความที่น่าสนใจ” บนหน้าแรก</CardDescription>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-md border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge>{typeLabel[item.type] ?? item.type}</Badge>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={item.isActive} onCheckedChange={(checked) => updateItem(item.id, { isActive: checked === true })} />
                แสดงผล
              </label>
            </div>
            <Input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} placeholder="หัวข้อ" />
            <Input value={item.subtitle ?? ""} onChange={(event) => updateItem(item.id, { subtitle: event.target.value })} placeholder="คำอธิบายสั้น" />
            {item.type === "ARTICLE" ? (
              <RichTextEditor value={item.body ?? ""} onChange={(value) => updateItem(item.id, { body: value })} />
            ) : (
              <Input value={item.body ?? ""} onChange={(event) => updateItem(item.id, { body: event.target.value })} placeholder="รายละเอียด" />
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <Input value={item.href ?? ""} onChange={(event) => updateItem(item.id, { href: event.target.value })} placeholder="/auctions" />
              <Input
                type="number"
                value={item.sortOrder}
                onChange={(event) => updateItem(item.id, { sortOrder: Number(event.target.value) })}
                placeholder="ลำดับ"
              />
            </div>
            <Input value={item.imageUrl ?? ""} onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })} placeholder="/assets/trading-card-products.png" />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={item.badge ?? ""} onChange={(event) => updateItem(item.id, { badge: event.target.value })} placeholder="Badge" />
              <Button type="button" onClick={() => saveItem(item)}>
                <Save data-icon="inline-start" />
                บันทึก
              </Button>
            </div>
          </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export { AdminHomeContentManager };
