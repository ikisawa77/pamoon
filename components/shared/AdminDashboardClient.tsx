"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, Play, Save, ShieldCheck } from "lucide-react";
import { AdminHomeContentManager } from "@/components/shared/AdminHomeContentManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AdminTab = "overview" | "home" | "catalog" | "products" | "auctions" | "orders" | "shops" | "users" | "messages" | "sla";

interface HomeContentItem {
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

interface AdminStat {
  label: string;
  value: string;
  detail: string;
}

interface CardSetRow {
  id: string;
  gameName: string;
  category: string;
  setCode: string;
  setName: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  auctionCount: number;
  buyCount: number;
}

interface ProductRow {
  id: string;
  title: string;
  cardCode: string;
  setName: string;
  seller: string;
  mode: string;
  status: string;
  rarity: string;
  currentPriceCents: number;
  auctionEndsAt: string | null;
  bidCount: number;
  favoriteCount: number;
}

interface OrderRow {
  id: string;
  productTitle: string;
  buyerEmail: string;
  seller: string;
  source: string;
  status: string;
  amountCents: number;
  paymentDueAt: string | null;
  shipDueAt: string | null;
  refundDueAt: string | null;
  trackingNumber: string | null;
}

interface ShopRow {
  id: string;
  name: string;
  ownerEmail: string;
  status: string;
  productCount: number;
  orderCount: number;
  moderationCount: number;
}

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  walletBalanceCents: number;
  bidLimitCents: number;
  orderCount: number;
  bidCount: number;
}

interface NotificationRow {
  id: string;
  recipient: string;
  type: string;
  title: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

interface EmailRow {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  reason: string | null;
  createdAt: string;
}

interface ModerationRow {
  id: string;
  type: string;
  status: string;
  reason: string;
  user: string | null;
  shop: string | null;
  orderProduct: string | null;
  createdAt: string;
}

interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  message: string;
  createdAt: string;
}

interface AdminDashboardClientProps {
  stats: AdminStat[];
  homeContents: HomeContentItem[];
  cardSets: CardSetRow[];
  products: ProductRow[];
  orders: OrderRow[];
  shops: ShopRow[];
  users: UserRow[];
  notifications: NotificationRow[];
  emails: EmailRow[];
  moderationCases: ModerationRow[];
  auditLogs: AuditRow[];
}

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "ภาพรวม" },
  { id: "home", label: "หน้าแรก" },
  { id: "catalog", label: "คลังการ์ด" },
  { id: "products", label: "สินค้า" },
  { id: "auctions", label: "ประมูล" },
  { id: "orders", label: "คำสั่งซื้อ" },
  { id: "shops", label: "ร้านค้า" },
  { id: "users", label: "สมาชิก" },
  { id: "messages", label: "แจ้งเตือน/อีเมล" },
  { id: "sla", label: "SLA/Moderation" },
];

const money = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })
    .format(value / 100)
    .replace("THB", "฿");

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString("th-TH") : "-");

const statusVariant = (status: string): "default" | "secondary" | "destructive" => {
  if (["ACTIVE", "APPROVED", "PAID", "SHIPPED", "COMPLETED", "SENT", "RESOLVED"].includes(status)) return "default";
  if (["SUSPENDED", "REMOVED", "PAYMENT_EXPIRED", "REFUND_PENDING", "FAILED", "OPEN"].includes(status)) return "destructive";
  return "secondary";
};

const AdminDashboardClient = ({
  stats,
  homeContents,
  cardSets,
  products,
  orders,
  shops,
  users,
  notifications,
  emails,
  moderationCases,
  auditLogs,
}: AdminDashboardClientProps) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [message, setMessage] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [setEdits, setSetEdits] = useState<Record<string, CardSetRow>>(() =>
    Object.fromEntries(cardSets.map((set) => [set.id, set])),
  );

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.title} ${product.cardCode} ${product.setName} ${product.seller} ${product.status} ${product.mode}`.toLowerCase().includes(query),
    );
  }, [productQuery, products]);

  const runAction = async (payload: Record<string, unknown>, successMessage: string) => {
    setMessage("");
    const response = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { ok: boolean; error?: { message: string }; message?: string };

    if (!response.ok || !result.ok) {
      setMessage(result.error?.message ?? result.message ?? "ทำรายการไม่สำเร็จ");
      return;
    }

    setMessage(successMessage);
    window.setTimeout(() => window.location.reload(), 500);
  };

  const saveCardSet = (setId: string) => {
    const set = setEdits[setId];
    void runAction(
      {
        action: "update-card-set",
        setId,
        setName: set.setName,
        label: set.label,
        sortOrder: set.sortOrder,
        isActive: set.isActive,
      },
      "บันทึกชุดการ์ดแล้ว",
    );
  };

  const createCardSet = (formData: FormData) => {
    void runAction(
      {
        action: "create-card-set",
        gameName: String(formData.get("gameName") ?? "One Piece Card Game (Japanese)"),
        category: String(formData.get("category") ?? "OP01"),
        setCode: String(formData.get("setCode") ?? ""),
        setName: String(formData.get("setName") ?? ""),
        label: String(formData.get("label") ?? ""),
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        isActive: formData.get("isActive") === "on",
      },
      "เพิ่มชุดการ์ดแล้ว",
    );
  };

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex gap-2 overflow-x-auto rounded-md border bg-background p-2">
        {tabs.map((tab) => (
          <Button key={tab.id} type="button" variant={activeTab === tab.id ? "default" : "ghost"} className="shrink-0" onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </Button>
        ))}
      </div>

      {message ? <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">{message}</div> : null}

      {activeTab === "overview" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {stats.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{card.detail}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "home" ? <AdminHomeContentManager contents={homeContents} /> : null}

      {activeTab === "catalog" ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>คลังชุดการ์ด</CardTitle>
              <CardDescription>ชุดที่เปิดใช้งานจะถูกใช้ในฟอร์มลงสินค้าและ API ลงสินค้า</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {cardSets.map((set) => {
                const edit = setEdits[set.id];
                return (
                  <div key={set.id} className="grid gap-3 rounded-md border bg-background p-4 lg:grid-cols-[120px_1fr_1fr_90px_120px_auto] lg:items-center">
                    <Badge>{set.category}</Badge>
                    <Input value={edit.setName} onChange={(event) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, setName: event.target.value } }))} />
                    <Input value={edit.label} onChange={(event) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, label: event.target.value } }))} />
                    <Input type="number" value={edit.sortOrder} onChange={(event) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, sortOrder: Number(event.target.value) } }))} />
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={edit.isActive} onCheckedChange={(checked) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, isActive: checked === true } }))} />
                      เปิดใช้งาน
                    </label>
                    <Button type="button" onClick={() => saveCardSet(set.id)}>
                      <Save data-icon="inline-start" />
                      บันทึก
                    </Button>
                    <div className="text-xs text-muted-foreground lg:col-span-6">
                      {set.gameName} · {set.setCode} · สินค้า {set.productCount} รายการ · ประมูล {set.auctionCount} · ซื้อเลย {set.buyCount}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>เพิ่มชุดการ์ด</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createCardSet} className="grid gap-3 md:grid-cols-3">
                <Input name="gameName" defaultValue="One Piece Card Game (Japanese)" />
                <Input name="category" placeholder="OP01" />
                <Input name="setCode" placeholder="OP-01" />
                <Input name="setName" placeholder="Romance Dawn" />
                <Input name="label" placeholder="[OP-01] Romance Dawn" />
                <Input name="sortOrder" type="number" defaultValue={10} />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="isActive" defaultChecked />
                  เปิดใช้งาน
                </label>
                <Button type="submit">เพิ่มชุด</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "products" || activeTab === "auctions" ? (
        <Card>
          <CardHeader>
            <CardTitle>{activeTab === "auctions" ? "คิวประมูล" : "จัดการสินค้า"}</CardTitle>
            <CardDescription>ค้นหาตามชื่อ รหัสการ์ด ร้านค้า สถานะ หรือประเภทสินค้า</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="ค้นหา OP01-121, Yamato, ร้านค้า, ACTIVE" />
            <AdminTable>
              <thead>
                <tr>
                  <Th>สินค้า</Th>
                  <Th>ร้าน</Th>
                  <Th>ประเภท</Th>
                  <Th>ราคา</Th>
                  <Th>สถานะ</Th>
                  <Th>ข้อมูล</Th>
                  <Th>จัดการ</Th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.filter((product) => activeTab !== "auctions" || product.mode === "AUCTION").map((product) => (
                  <tr key={product.id} className="border-b last:border-b-0">
                    <Td>
                      <strong>{product.title}</strong>
                      <span className="block text-xs text-muted-foreground">{product.cardCode} · {product.setName}</span>
                    </Td>
                    <Td>{product.seller}</Td>
                    <Td>{product.mode}</Td>
                    <Td>{money(product.currentPriceCents)}</Td>
                    <Td><Badge variant={statusVariant(product.status)}>{product.status}</Badge></Td>
                    <Td>{product.bidCount} bid · {product.favoriteCount} fav · {formatDate(product.auctionEndsAt)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={product.mode === "AUCTION" ? `/auctions/${product.id}` : `/buy-now/${product.id}`}>ดู</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void runAction({ action: "product-status", productId: product.id, status: product.status === "ACTIVE" ? "REMOVED" : "ACTIVE" }, "อัปเดตสินค้าแล้ว")}>
                          {product.status === "ACTIVE" ? "ถอด" : "เปิด"}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "orders" ? (
        <Card>
          <CardHeader><CardTitle>คำสั่งซื้อและ Timeline</CardTitle></CardHeader>
          <CardContent>
            <AdminTable>
              <thead><tr><Th>สินค้า</Th><Th>ผู้ซื้อ/ร้าน</Th><Th>สถานะ</Th><Th>Timeline</Th><Th>จัดการ</Th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-b-0">
                    <Td><strong>{order.productTitle}</strong><span className="block text-xs text-muted-foreground">{order.source} · {money(order.amountCents)}</span></Td>
                    <Td>{order.buyerEmail}<span className="block text-xs text-muted-foreground">{order.seller}</span></Td>
                    <Td><Badge variant={statusVariant(order.status)}>{order.status}</Badge></Td>
                    <Td>จ่าย: {formatDate(order.paymentDueAt)} · ส่ง: {formatDate(order.shipDueAt)} · คืน: {formatDate(order.refundDueAt)} · Tracking: {order.trackingNumber ?? "-"}</Td>
                    <Td>{order.status === "REFUND_PENDING" ? <Button size="sm" onClick={() => void runAction({ action: "mark-refunded", orderId: order.id }, "คืนเงินแล้ว")}>Mark refunded</Button> : "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "shops" ? (
        <EntityStatusTable title="ร้านค้า" rows={shops.map((shop) => ({ id: shop.id, main: shop.name, sub: `${shop.ownerEmail} · สินค้า ${shop.productCount} · order ${shop.orderCount} · case ${shop.moderationCount}`, status: shop.status }))} statuses={["APPROVED", "SUSPENDED", "PENDING", "REJECTED"]} actionName="shop-status" idName="shopId" runAction={runAction} />
      ) : null}

      {activeTab === "users" ? (
        <EntityStatusTable title="สมาชิก" rows={users.map((user) => ({ id: user.id, main: user.email, sub: `${user.displayName} · ${user.role} · wallet ${money(user.walletBalanceCents)} · bid limit ${money(user.bidLimitCents)} · order ${user.orderCount} · bid ${user.bidCount}`, status: user.status }))} statuses={["ACTIVE", "SUSPENDED", "PENDING_REVIEW"]} actionName="user-status" idName="userId" runAction={runAction} />
      ) : null}

      {activeTab === "messages" ? (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><CardTitle>อีเมล Outbox</CardTitle><CardDescription>ตรวจสถานะอีเมลแจ้งเตือนและส่งค้างส่งแบบ manual</CardDescription></div>
              <Button onClick={() => void runAction({ action: "flush-email" }, "สั่งส่งอีเมลค้างส่งแล้ว")}><Mail data-icon="inline-start" />Flush email</Button>
            </CardHeader>
            <CardContent>
              <AdminTable>
                <thead><tr><Th>ผู้รับ</Th><Th>หัวข้อ</Th><Th>สถานะ</Th><Th>เหตุผล</Th><Th>เวลา</Th></tr></thead>
                <tbody>{emails.map((email) => <tr key={email.id} className="border-b last:border-b-0"><Td>{email.toEmail}</Td><Td>{email.subject}</Td><Td><Badge variant={statusVariant(email.status)}>{email.status}</Badge></Td><Td>{email.reason ?? "-"}</Td><Td>{formatDate(email.createdAt)}</Td></tr>)}</tbody>
              </AdminTable>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
            <CardContent>
              <AdminTable>
                <thead><tr><Th>ผู้รับ</Th><Th>ประเภท</Th><Th>หัวข้อ</Th><Th>อ่านแล้ว</Th><Th>ลิงก์</Th></tr></thead>
                <tbody>{notifications.map((item) => <tr key={item.id} className="border-b last:border-b-0"><Td>{item.recipient}</Td><Td>{item.type}</Td><Td>{item.title}</Td><Td>{item.readAt ? "อ่านแล้ว" : "ยังไม่อ่าน"}</Td><Td>{item.href ?? "-"}</Td></tr>)}</tbody>
              </AdminTable>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "sla" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><CardTitle>SLA และ Moderation</CardTitle><CardDescription>รัน job ตรวจประมูล/จ่ายเงิน/จัดส่ง/คืนเงิน และปิดเคสที่ตรวจแล้ว</CardDescription></div>
              <Button onClick={() => void runAction({ action: "run-sla" }, "รัน SLA processor แล้ว")}><Play data-icon="inline-start" />Run SLA</Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {moderationCases.map((item) => (
                <div key={item.id} className="rounded-md border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{item.type}</strong>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                  <p className="mt-2 text-xs text-muted-foreground">สมาชิก: {item.user ?? "-"} · ร้าน: {item.shop ?? "-"} · สินค้า: {item.orderProduct ?? "-"}</p>
                  {item.status === "OPEN" ? <Button className="mt-3" size="sm" onClick={() => void runAction({ action: "resolve-moderation", caseId: item.id }, "ปิดเคสแล้ว")}><ShieldCheck data-icon="inline-start" />Resolve</Button> : null}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {auditLogs.map((log) => <div key={log.id} className="rounded-md border bg-background p-3 text-sm"><strong>{log.action}</strong><p className="text-muted-foreground">{log.message}</p><span className="text-xs text-muted-foreground">{log.targetType} · {formatDate(log.createdAt)}</span></div>)}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
};

const AdminTable = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full min-w-[900px] text-left text-sm">{children}</table>
  </div>
);

const Th = ({ children }: { children: ReactNode }) => <th className="bg-muted px-3 py-2 font-medium text-muted-foreground">{children}</th>;
const Td = ({ children }: { children: ReactNode }) => <td className="px-3 py-3 align-top">{children}</td>;

interface EntityStatusRow {
  id: string;
  main: string;
  sub: string;
  status: string;
}

const EntityStatusTable = ({
  title,
  rows,
  statuses,
  actionName,
  idName,
  runAction,
}: {
  title: string;
  rows: EntityStatusRow[];
  statuses: string[];
  actionName: string;
  idName: string;
  runAction: (payload: Record<string, unknown>, successMessage: string) => Promise<void>;
}) => (
  <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-col gap-3 rounded-md border bg-background p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <strong>{row.main}</strong>
            <p className="text-sm text-muted-foreground">{row.sub}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            {statuses.map((status) => (
              <Button key={status} size="sm" variant={row.status === status ? "default" : "outline"} className={cn(row.status === status && "pointer-events-none")} onClick={() => void runAction({ action: actionName, [idName]: row.id, status }, "อัปเดตสถานะแล้ว")}>
                {status}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export { AdminDashboardClient };
