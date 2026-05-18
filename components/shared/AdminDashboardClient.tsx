"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Boxes,
  ClipboardCheck,
  Gavel,
  Home,
  Mail,
  Package,
  Play,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { AdminHomeContentManager } from "@/components/shared/AdminHomeContentManager";
import { useAppConfirmDialog } from "@/components/shared/AppConfirmDialog";
import type { ConfirmOptions } from "@/components/shared/AppConfirmDialog";
import { LogoutButton } from "@/components/shared/LogoutButton";
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

interface EmailTemplateRow {
  id: string;
  type: string;
  name: string;
  subject: string;
  preheader: string | null;
  headline: string;
  body: string;
  accentColor: string;
  ctaLabel: string;
  isActive: boolean;
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
  emailTemplates: EmailTemplateRow[];
  moderationCases: ModerationRow[];
  auditLogs: AuditRow[];
}

const tabs = [
  { id: "overview", label: "ภาพรวม", icon: Settings },
  { id: "home", label: "หน้าแรก", icon: Home },
  { id: "catalog", label: "คลังการ์ด", icon: BookOpen },
  { id: "products", label: "สินค้า", icon: Package },
  { id: "auctions", label: "ประมูล", icon: Gavel },
  { id: "orders", label: "คำสั่งซื้อ", icon: ClipboardCheck },
  { id: "shops", label: "ร้านค้า", icon: Store },
  { id: "users", label: "สมาชิก", icon: Users },
  { id: "messages", label: "แจ้งเตือน/อีเมล", icon: Mail },
  { id: "sla", label: "SLA/Moderation", icon: ShieldCheck },
] satisfies Array<{ id: AdminTab; label: string; icon: typeof Settings }>;

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

const modeLabel = (mode: string) => (mode === "AUCTION" ? "ประมูล" : "ซื้อเลย");

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
  emailTemplates,
  moderationCases,
  auditLogs,
}: AdminDashboardClientProps) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [message, setMessage] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [setEdits, setSetEdits] = useState<Record<string, CardSetRow>>(() => Object.fromEntries(cardSets.map((set) => [set.id, set])));
  const [templateEdits, setTemplateEdits] = useState<Record<string, EmailTemplateRow>>(() =>
    Object.fromEntries(emailTemplates.map((template) => [template.id, template])),
  );
  const { confirm, confirmDialog } = useAppConfirmDialog();

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    const source = activeTab === "auctions" ? products.filter((product) => product.mode === "AUCTION") : products;
    if (!query) return source;
    return source.filter((product) =>
      `${product.title} ${product.cardCode} ${product.setName} ${product.seller} ${product.status} ${product.rarity}`
        .toLowerCase()
        .includes(query),
    );
  }, [activeTab, productQuery, products]);

  const getConfirmOptions = (payload: Record<string, unknown>): ConfirmOptions | undefined => {
    const action = typeof payload.action === "string" ? payload.action : "";

    if (action === "flush-email") {
      return {
        title: "ส่งอีเมลค้างส่ง",
        description: "ระบบจะลองส่ง Email outbox ที่ยังรอส่งตามค่า SMTP ปัจจุบัน",
        confirmLabel: "Flush email",
        cancelLabel: "ยกเลิก",
        tone: "default",
      };
    }

    if (action === "run-sla") {
      return {
        title: "รัน SLA processor",
        description: "ตรวจประมูลที่จบแล้ว การจ่ายเงินเกินเวลา การจัดส่งเกินเวลา refund และแชทหมดอายุ",
        confirmLabel: "Run SLA",
        cancelLabel: "ยกเลิก",
        tone: "warning",
      };
    }

    if (action === "product-status") {
      const productId = typeof payload.productId === "string" ? payload.productId : "";
      const status = typeof payload.status === "string" ? payload.status : "";
      const product = products.find((item) => item.id === productId);
      return {
        title: status === "REMOVED" ? "ถอดสินค้าออกจากตลาด" : "เปิดสินค้ากลับเข้าตลาด",
        description: "สถานะนี้มีผลกับหน้าซื้อขายและหน้าประมูลทันที",
        confirmLabel: status === "REMOVED" ? "ถอดสินค้า" : "เปิดสินค้า",
        cancelLabel: "ยกเลิก",
        tone: status === "REMOVED" ? "destructive" : "success",
        details: [
          { label: "สินค้า", value: product?.title ?? productId },
          { label: "สถานะใหม่", value: status },
        ],
      };
    }

    if (action === "mark-refunded") {
      const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
      const order = orders.find((item) => item.id === orderId);
      return {
        title: "ยืนยันคืนเงิน",
        description: "ใช้เมื่อผู้ดูแลตรวจสอบแล้วว่าคำสั่งซื้อนี้คืนเงินเรียบร้อย",
        confirmLabel: "Mark refunded",
        cancelLabel: "ยกเลิก",
        tone: "warning",
        details: [
          { label: "สินค้า", value: order?.productTitle ?? orderId },
          { label: "ยอดเงิน", value: order ? money(order.amountCents) : "-" },
        ],
      };
    }

    if (action === "resolve-moderation") {
      const caseId = typeof payload.caseId === "string" ? payload.caseId : "";
      const moderationCase = moderationCases.find((item) => item.id === caseId);
      return {
        title: "ปิดเคสตรวจสอบ",
        description: "เคสนี้จะถูกเปลี่ยนเป็น resolved และบันทึกใน audit log",
        confirmLabel: "Resolve",
        cancelLabel: "ยกเลิก",
        tone: "success",
        details: [{ label: "เหตุผล", value: moderationCase?.reason ?? caseId }],
      };
    }

    if (action === "shop-status" || action === "user-status") {
      const status = typeof payload.status === "string" ? payload.status : "";
      const idKey = action === "shop-status" ? "shopId" : "userId";
      const id = typeof payload[idKey] === "string" ? payload[idKey] : "";
      const target = action === "shop-status" ? shops.find((item) => item.id === id)?.name : users.find((item) => item.id === id)?.email;
      return {
        title: action === "shop-status" ? "เปลี่ยนสถานะร้านค้า" : "เปลี่ยนสถานะสมาชิก",
        description: "การเปลี่ยนสถานะมีผลกับสิทธิ์ใช้งานระบบทันที",
        confirmLabel: "ยืนยัน",
        cancelLabel: "ยกเลิก",
        tone: status === "SUSPENDED" || status === "REJECTED" ? "destructive" : "warning",
        details: [
          { label: "เป้าหมาย", value: target ?? id },
          { label: "สถานะใหม่", value: status },
        ],
      };
    }

    return undefined;
  };

  const runAction = async (payload: Record<string, unknown>, successMessage: string, confirmOptions?: ConfirmOptions) => {
    const optionsToConfirm = confirmOptions ?? getConfirmOptions(payload);

    if (optionsToConfirm) {
      const confirmed = await confirm(optionsToConfirm);
      if (!confirmed) {
        setMessage("ยกเลิกการทำรายการแล้ว");
        return;
      }
    }

    try {
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
    } catch {
      setMessage("เชื่อมต่อระบบหลังบ้านไม่สำเร็จ");
    }
  };

  const saveCardSet = (setId: string) => {
    const set = setEdits[setId];
    if (!set) return;

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

  const saveEmailTemplate = (templateId: string) => {
    const template = templateEdits[templateId];
    if (!template) return;

    void runAction(
      {
        action: "update-email-template",
        templateId,
        subject: template.subject,
        preheader: template.preheader ?? "",
        headline: template.headline,
        body: template.body,
        accentColor: template.accentColor,
        ctaLabel: template.ctaLabel,
        isActive: template.isActive,
      },
      "บันทึกเทมเพลตอีเมลแล้ว",
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
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <Button asChild variant="ghost" className="mb-2 w-full justify-start">
            <Link href="/">
              <Home data-icon="inline-start" />
              กลับหน้าแรก
            </Link>
          </Button>
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant={active ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", active && "text-primary")}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon data-icon="inline-start" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </div>
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Settings />
            เครื่องมือผู้ดูแล
          </div>
          <div className="grid gap-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/account">บัญชีของฉัน</Link>
            </Button>
            <LogoutButton className="w-full justify-start" />
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-3">Admin Dashboard</Badge>
              <h1 className="text-3xl font-bold tracking-tight">ระบบหลังบ้าน BidCard TH</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                จัดการหน้าแรก คลังการ์ด สินค้า ประมูล คำสั่งซื้อ ร้านค้า สมาชิก แจ้งเตือน อีเมล และคิว SLA จากที่เดียว
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/">กลับไปหน้าแรก</Link>
              </Button>
              <Button onClick={() => void runAction({ action: "run-sla" }, "รัน SLA processor แล้ว")}>
                <Play data-icon="inline-start" />
                รัน SLA
              </Button>
            </div>
          </div>
        </div>

        {message ? <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground shadow-sm">{message}</div> : null}

        {activeTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((card) => (
                <Card key={card.label} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle className="text-3xl">{card.value}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{card.detail}</CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>งานที่ต้องดูแล</CardTitle>
                  <CardDescription>คิวล่าสุดจาก SLA และ moderation</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {moderationCases.slice(0, 5).map((item) => (
                    <CompactRow key={item.id} title={item.type} subtitle={item.reason} meta={formatDate(item.createdAt)} badge={item.status} />
                  ))}
                  {moderationCases.length === 0 ? <EmptyState text="ยังไม่มีเคสที่ต้องตรวจสอบ" /> : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>คำสั่งซื้อล่าสุด</CardTitle>
                  <CardDescription>ตรวจสถานะจ่ายเงิน จัดส่ง และ refund</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {orders.slice(0, 5).map((order) => (
                    <CompactRow
                      key={order.id}
                      title={order.productTitle}
                      subtitle={`${order.buyerEmail} / ${order.seller}`}
                      meta={money(order.amountCents)}
                      badge={order.status}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === "home" ? <AdminHomeContentManager contents={homeContents} /> : null}

        {activeTab === "catalog" ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>เพิ่มชุดการ์ด</CardTitle>
                <CardDescription>ชุดที่เปิดใช้งานจะแสดงในฟอร์มลงสินค้าและระบบค้นหารหัสการ์ด</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCardSet} className="grid gap-3 lg:grid-cols-[1.4fr_120px_160px_1.4fr_90px_auto] lg:items-end">
                  <label className="grid gap-2 text-sm">
                    การ์ดเกม
                    <Input name="gameName" defaultValue="One Piece Card Game (Japanese)" />
                  </label>
                  <label className="grid gap-2 text-sm">
                    หมวด
                    <Input name="category" placeholder="OP01" />
                  </label>
                  <label className="grid gap-2 text-sm">
                    รหัสชุด
                    <Input name="setCode" placeholder="OP-01" />
                  </label>
                  <label className="grid gap-2 text-sm">
                    ชื่อชุด
                    <Input name="setName" placeholder="Romance Dawn" />
                  </label>
                  <label className="grid gap-2 text-sm">
                    ลำดับ
                    <Input name="sortOrder" type="number" defaultValue={0} />
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <Checkbox name="isActive" defaultChecked />
                    เปิดใช้งาน
                  </label>
                  <Button type="submit" className="lg:col-span-6">
                    <Boxes data-icon="inline-start" />
                    เพิ่มชุดการ์ด
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>คลังชุดการ์ด</CardTitle>
                <CardDescription>แก้ชื่อชุด ลำดับ และเปิด/ปิดการใช้งานได้จากหลังบ้าน</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {cardSets.map((set) => {
                  const edit = setEdits[set.id] ?? set;
                  return (
                    <div key={set.id} className="grid gap-3 rounded-lg border bg-background p-4 xl:grid-cols-[110px_1fr_1fr_90px_120px_auto] xl:items-center">
                      <Badge>{set.category}</Badge>
                      <Input value={edit.setName} onChange={(event) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, setName: event.target.value } }))} />
                      <Input value={edit.label} onChange={(event) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, label: event.target.value } }))} />
                      <Input
                        type="number"
                        value={edit.sortOrder}
                        onChange={(event) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, sortOrder: Number(event.target.value) } }))}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={edit.isActive}
                          onCheckedChange={(checked) => setSetEdits((current) => ({ ...current, [set.id]: { ...edit, isActive: checked === true } }))}
                        />
                        เปิดใช้งาน
                      </label>
                      <Button type="button" size="sm" onClick={() => saveCardSet(set.id)}>
                        <Save data-icon="inline-start" />
                        บันทึก
                      </Button>
                      <p className="text-xs text-muted-foreground xl:col-span-6">
                        {set.gameName} / {set.setCode} / สินค้ารวม {set.productCount} รายการ / ประมูล {set.auctionCount} / ซื้อเลย {set.buyCount}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "products" || activeTab === "auctions" ? (
          <Card>
            <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{activeTab === "auctions" ? "จัดการประมูล" : "จัดการสินค้า"}</CardTitle>
                <CardDescription>ค้นหาตามชื่อสินค้า รหัสการ์ด ร้านค้า ระดับ หรือสถานะ</CardDescription>
              </div>
              <Input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="ค้นหาการ์ด ร้านค้า หรือรหัสการ์ด" className="lg:max-w-sm" />
            </CardHeader>
            <CardContent>
              <AdminTable>
                <thead>
                  <tr>
                    <Th>สินค้า</Th>
                    <Th>ร้านค้า</Th>
                    <Th>ประเภท</Th>
                    <Th>ราคา</Th>
                    <Th>สถานะ</Th>
                    <Th>ข้อมูล</Th>
                    <Th>จัดการ</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <Td>
                        <strong>{product.title}</strong>
                        <span className="block text-xs text-muted-foreground">{product.cardCode} / {product.setName} / {product.rarity}</span>
                      </Td>
                      <Td>{product.seller}</Td>
                      <Td>{modeLabel(product.mode)}</Td>
                      <Td>{money(product.currentPriceCents)}</Td>
                      <Td><Badge variant={statusVariant(product.status)}>{product.status}</Badge></Td>
                      <Td>{product.bidCount} bid / {product.favoriteCount} fav / {formatDate(product.auctionEndsAt)}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={product.mode === "AUCTION" ? `/auctions/${product.id}` : `/buy-now/${product.id}`}>ดู</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(
                                { action: "product-status", productId: product.id, status: product.status === "ACTIVE" ? "REMOVED" : "ACTIVE" },
                                "อัปเดตสถานะสินค้าแล้ว",
                              )
                            }
                          >
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
            <CardHeader>
              <CardTitle>คำสั่งซื้อและ Timeline</CardTitle>
              <CardDescription>ติดตาม payment due, ship due, refund due และเลขพัสดุ</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTable>
                <thead>
                  <tr>
                    <Th>สินค้า</Th>
                    <Th>ผู้ซื้อ/ร้าน</Th>
                    <Th>สถานะ</Th>
                    <Th>Timeline</Th>
                    <Th>จัดการ</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <Td><strong>{order.productTitle}</strong><span className="block text-xs text-muted-foreground">{order.source} / {money(order.amountCents)}</span></Td>
                      <Td>{order.buyerEmail}<span className="block text-xs text-muted-foreground">{order.seller}</span></Td>
                      <Td><Badge variant={statusVariant(order.status)}>{order.status}</Badge></Td>
                      <Td>จ่าย: {formatDate(order.paymentDueAt)} / ส่ง: {formatDate(order.shipDueAt)} / คืน: {formatDate(order.refundDueAt)} / Tracking: {order.trackingNumber ?? "-"}</Td>
                      <Td>
                        {order.status === "REFUND_PENDING" ? (
                          <Button size="sm" onClick={() => void runAction({ action: "mark-refunded", orderId: order.id }, "คืนเงินแล้ว")}>Mark refunded</Button>
                        ) : "-"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "shops" ? (
          <EntityStatusTable
            title="ร้านค้า"
            rows={shops.map((shop) => ({
              id: shop.id,
              main: shop.name,
              sub: `${shop.ownerEmail} / สินค้า ${shop.productCount} / order ${shop.orderCount} / case ${shop.moderationCount}`,
              status: shop.status,
            }))}
            statuses={["APPROVED", "SUSPENDED", "PENDING", "REJECTED"]}
            actionName="shop-status"
            idName="shopId"
            runAction={runAction}
          />
        ) : null}

        {activeTab === "users" ? (
          <EntityStatusTable
            title="สมาชิก"
            rows={users.map((user) => ({
              id: user.id,
              main: user.email,
              sub: `${user.displayName} / ${user.role} / wallet ${money(user.walletBalanceCents)} / bid limit ${money(user.bidLimitCents)} / order ${user.orderCount} / bid ${user.bidCount}`,
              status: user.status,
            }))}
            statuses={["ACTIVE", "SUSPENDED", "PENDING_REVIEW"]}
            actionName="user-status"
            idName="userId"
            runAction={runAction}
          />
        ) : null}

        {activeTab === "messages" ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ตั้งค่าเทมเพลตอีเมลแจ้งเตือน</CardTitle>
                <CardDescription>แก้หัวข้อ เนื้อหา สี และปุ่มของอีเมลประมูล/ชำระเงินได้จากหลังบ้าน</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {emailTemplates.map((template) => {
                  const edit = templateEdits[template.id] ?? template;
                  return (
                    <div key={template.id} className="grid gap-3 rounded-lg border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <Badge variant="outline">{template.type}</Badge>
                          <h3 className="mt-2 font-semibold">{template.name}</h3>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={edit.isActive}
                            onCheckedChange={(checked) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, isActive: checked === true } }))}
                          />
                          เปิดใช้งาน
                        </label>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input value={edit.subject} onChange={(event) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, subject: event.target.value } }))} placeholder="หัวข้ออีเมล" />
                        <Input value={edit.headline} onChange={(event) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, headline: event.target.value } }))} placeholder="หัวเรื่องในอีเมล" />
                        <Input value={edit.preheader ?? ""} onChange={(event) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, preheader: event.target.value } }))} placeholder="ข้อความพรีวิวใน inbox" />
                        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                          <Input value={edit.accentColor} onChange={(event) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, accentColor: event.target.value } }))} placeholder="#22c55e" />
                          <Input value={edit.ctaLabel} onChange={(event) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, ctaLabel: event.target.value } }))} placeholder="ข้อความปุ่ม" />
                        </div>
                      </div>
                      <textarea
                        value={edit.body}
                        onChange={(event) => setTemplateEdits((current) => ({ ...current, [template.id]: { ...edit, body: event.target.value } }))}
                        className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="เนื้อหาอีเมล ใช้ตัวแปร เช่น {{productTitle}}, {{currentPrice}}, {{timeLeft}}, {{paymentDue}}"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>ตัวแปร: {"{{recipientName}} {{productTitle}} {{currentPrice}} {{timeLeft}} {{paymentDue}} {{sellerName}}"}</span>
                        <Button type="button" size="sm" onClick={() => saveEmailTemplate(template.id)}>
                          <Save data-icon="inline-start" />
                          บันทึกเทมเพลต
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>อีเมล Outbox</CardTitle>
                  <CardDescription>ตรวจสถานะอีเมลแจ้งเตือนและส่งค้างส่งแบบ manual</CardDescription>
                </div>
                <Button onClick={() => void runAction({ action: "flush-email" }, "สั่งส่งอีเมลค้างส่งแล้ว")}>
                  <Mail data-icon="inline-start" />
                  Flush email
                </Button>
              </CardHeader>
              <CardContent>
                <AdminTable>
                  <thead><tr><Th>ผู้รับ</Th><Th>หัวข้อ</Th><Th>สถานะ</Th><Th>เหตุผล</Th><Th>เวลา</Th></tr></thead>
                  <tbody>{emails.map((email) => <tr key={email.id} className="border-b last:border-b-0"><Td>{email.toEmail}</Td><Td>{email.subject}</Td><Td><Badge variant={statusVariant(email.status)}>{email.status}</Badge></Td><Td>{email.reason ?? "-"}</Td><Td>{formatDate(email.createdAt)}</Td></tr>)}</tbody>
                </AdminTable>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>แจ้งเตือนในระบบล่าสุด</CardDescription>
              </CardHeader>
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
              <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>SLA และ Moderation</CardTitle>
                  <CardDescription>รัน job ตรวจประมูล จ่ายเงิน จัดส่ง คืนเงิน และปิดเคสที่ตรวจแล้ว</CardDescription>
                </div>
                <Button onClick={() => void runAction({ action: "run-sla" }, "รัน SLA processor แล้ว")}>
                  <Play data-icon="inline-start" />
                  Run SLA
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3">
                {moderationCases.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{item.type}</strong>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                    <p className="mt-2 text-xs text-muted-foreground">สมาชิก: {item.user ?? "-"} / ร้าน: {item.shop ?? "-"} / สินค้า: {item.orderProduct ?? "-"}</p>
                    {item.status === "OPEN" ? (
                      <Button className="mt-3" size="sm" onClick={() => void runAction({ action: "resolve-moderation", caseId: item.id }, "ปิดเคสแล้ว")}>
                        <ShieldCheck data-icon="inline-start" />
                        Resolve
                      </Button>
                    ) : null}
                  </div>
                ))}
                {moderationCases.length === 0 ? <EmptyState text="ยังไม่มีเคส moderation" /> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>บันทึกการทำรายการสำคัญของผู้ดูแล</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border bg-background p-3 text-sm">
                    <strong>{log.action}</strong>
                    <p className="text-muted-foreground">{log.message}</p>
                    <span className="text-xs text-muted-foreground">{log.targetType} / {formatDate(log.createdAt)}</span>
                  </div>
                ))}
                {auditLogs.length === 0 ? <EmptyState text="ยังไม่มี audit log" /> : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
      {confirmDialog}
    </div>
  );
};

const AdminTable = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full min-w-[900px] text-left text-sm">{children}</table>
  </div>
);

const Th = ({ children }: { children: ReactNode }) => <th className="bg-muted px-3 py-2 font-medium text-muted-foreground">{children}</th>;
const Td = ({ children }: { children: ReactNode }) => <td className="px-3 py-3 align-top">{children}</td>;

const EmptyState = ({ text }: { text: string }) => <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">{text}</div>;

const CompactRow = ({ title, subtitle, meta, badge }: { title: string; subtitle: string; meta: string; badge: string }) => (
  <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <strong className="block truncate">{title}</strong>
      <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-muted-foreground">{meta}</span>
      <Badge variant={statusVariant(badge)}>{badge}</Badge>
    </div>
  </div>
);

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
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>ตรวจสถานะและปรับสิทธิ์การใช้งานได้จากหลังบ้าน</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <strong>{row.main}</strong>
            <p className="text-sm text-muted-foreground">{row.sub}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            {statuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={row.status === status ? "default" : "outline"}
                className={cn(row.status === status && "pointer-events-none")}
                onClick={() => void runAction({ action: actionName, [idName]: row.id, status }, "อัปเดตสถานะแล้ว")}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 ? <EmptyState text="ยังไม่มีข้อมูล" /> : null}
    </CardContent>
  </Card>
);

export { AdminDashboardClient };
