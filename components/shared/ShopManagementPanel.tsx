"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Clock3, ImagePlus, PackagePlus, Search, ShieldCheck, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CARD_GAME_NAME, getProductCategoryFromCardCode, type RuntimeCardSetDefinition } from "@/lib/card-catalog";
import type { ProductCategory, ProductRarity } from "@/types/marketplace";

type ProductMode = "AUCTION" | "BUY";

interface ManagedProduct {
  id: string;
  title: string;
  cardCode: string;
  rarity: string;
  mode: ProductMode;
  status: string;
  currentPriceCents: number;
  auctionEndsAt: string | null;
}

interface ShopManagementPanelProps {
  shopSlug: string;
  shopName: string;
  activeSets: RuntimeCardSetDefinition[];
  products: ManagedProduct[];
}

interface UploadResponse {
  ok: boolean;
  url?: string;
  error?: string;
  message?: string;
}

interface CreateProductResponse {
  ok: boolean;
  product?: ManagedProduct;
  error?: string;
  message?: string;
}

interface CardLookupResponse {
  ok: boolean;
  card?: {
    cardCode: string;
    title: string;
    rarity: ProductRarity;
    sourceRarity: string;
    category: ProductCategory;
    setCode: string;
    setName: string;
    setLabel: string;
    imageUrl: string | null;
    priceThb: number | null;
  };
  error?: string;
  message?: string;
}

const rarities: ProductRarity[] = ["C", "UC", "R", "L", "SR", "SEC", "SP", "P"];
const conditions = ["Mint", "Near Mint", "Excellent", "Good", "Played"];
const cardCodePattern = /^(?:OP|EB|ST)\d{2}-\d{3}$|^PRB\d{2}-\d{3}$/;

const normalizeCardCode = (value: string) => value.toUpperCase().replace(/\s+/g, "");

const formatDateTimeLocal = (date: Date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
};

const defaultAuctionEnd = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(21, 0, 0, 0);
  return formatDateTimeLocal(date);
};

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const ShopManagementPanel = ({ shopSlug, shopName, activeSets, products }: ShopManagementPanelProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProductCategory>(activeSets[0]?.category ?? "op01");
  const [cardCode, setCardCode] = useState("");
  const [rarity, setRarity] = useState<ProductRarity>("R");
  const [condition, setCondition] = useState("Near Mint");
  const [description, setDescription] = useState("");
  const [openingPrice, setOpeningPrice] = useState("200");
  const [bidIncrement, setBidIncrement] = useState("50");
  const [auctionEndsAt, setAuctionEndsAt] = useState(defaultAuctionEnd);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lastLookupCode, setLastLookupCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managedProducts, setManagedProducts] = useState(products);

  const selectedSet = useMemo(() => activeSets.find((set) => set.category === category) ?? activeSets[0], [activeSets, category]);
  const auctionCount = managedProducts.filter((product) => product.mode === "AUCTION").length;
  const buyCount = managedProducts.filter((product) => product.mode === "BUY").length;

  const applyDetectedCategory = (normalized: string) => {
    const detectedCategory = getProductCategoryFromCardCode(normalized);

    if (detectedCategory && activeSets.some((set) => set.category === detectedCategory)) {
      setCategory(detectedCategory);
      return detectedCategory;
    }

    return category;
  };

  const lookupCard = async (normalizedCode: string, lookupCategory: ProductCategory) => {
    if (!cardCodePattern.test(normalizedCode) || normalizedCode === lastLookupCode) {
      return;
    }

    setLookupLoading(true);
    setLastLookupCode(normalizedCode);
    setError(null);

    try {
      const params = new URLSearchParams({ code: normalizedCode, category: lookupCategory });
      const response = await fetch(`/api/cards/lookup?${params.toString()}`);
      const data = (await response.json()) as CardLookupResponse;

      if (!response.ok || !data.ok || !data.card) {
        setMessage("ยังไม่พบรหัสนี้ในคลัง data-cardgame.com สามารถกรอกชื่อเองได้");
        return;
      }

      setTitle(data.card.title);
      setRarity(data.card.rarity);
      setCategory(data.card.category);
      setImageUrl(data.card.imageUrl ?? "");

      if (data.card.priceThb && Number(openingPrice) <= 200) {
        setOpeningPrice(String(Math.max(100, Math.round(data.card.priceThb * 0.7))));
      }

      setMessage(`พบการ์ด ${data.card.title} จาก ${data.card.setLabel} ระบบเติมข้อมูลให้แล้ว`);
    } catch {
      setMessage("ค้นหาการ์ดจาก data-cardgame.com ไม่สำเร็จชั่วคราว สามารถกรอกเองต่อได้");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCardCodeChange = (value: string) => {
    const normalized = normalizeCardCode(value);
    setCardCode(normalized);
    const nextCategory = applyDetectedCategory(normalized);

    if (cardCodePattern.test(normalized)) {
      void lookupCard(normalized, nextCategory);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads/product-image", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? data.message ?? "อัปโหลดรูปไม่สำเร็จ");
      }

      setImageUrl(data.url);
      setMessage("อัปโหลดรูปการ์ดเรียบร้อย");
    } catch (uploadError: unknown) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "auction",
          game: CARD_GAME_NAME,
          category,
          title,
          code: cardCode,
          rarity,
          openingPrice: Number(openingPrice),
          bidIncrement: Number(bidIncrement),
          buyNowPrice: 0,
          duration: "custom",
          auctionEndsAt: new Date(auctionEndsAt).toISOString(),
          condition,
          description,
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = (await response.json()) as CreateProductResponse;

      if (!response.ok || !data.ok || !data.product) {
        throw new Error(data.error ?? data.message ?? "เพิ่มประมูลไม่สำเร็จ");
      }

      setManagedProducts((current) => [data.product as ManagedProduct, ...current]);
      setTitle("");
      setCardCode("");
      setDescription("");
      setOpeningPrice("200");
      setBidIncrement("50");
      setAuctionEndsAt(defaultAuctionEnd());
      setImageUrl("");
      setLastLookupCode("");
      setMessage("เพิ่มประมูลสำเร็จ ระบบสร้างรายการให้ร้านค้าแล้ว");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "เพิ่มประมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-5 rounded-[28px] border bg-card p-5 shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Badge className="w-fit">โหมดจัดการร้าน</Badge>
        <div>
          <h2 className="text-2xl font-black">จัดการสินค้าและประมูล</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            ร้าน {shopName}: ใส่เพียงรหัสการ์ด เช่น OP01-121 ระบบจะค้นชื่อการ์ด ชุด ระดับ และรูปจาก data-cardgame.com ให้อัตโนมัติ
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href={`/shops/${shopSlug}`}>ดูหน้าร้านแบบลูกค้า</Link>
        </Button>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatusTile icon={<Trophy className="size-5" />} label="ประมูลในร้าน" value={`${auctionCount.toLocaleString("th-TH")} รายการ`} />
          <StatusTile icon={<PackagePlus className="size-5" />} label="ซื้อเลยในร้าน" value={`${buyCount.toLocaleString("th-TH")} รายการ`} />
          <StatusTile icon={<ShieldCheck className="size-5" />} label="ชุดการ์ด" value={`${activeSets.length.toLocaleString("th-TH")} ชุดพร้อมใช้งาน`} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-background p-4">
          <div>
            <h3 className="text-lg font-bold">เพิ่มประมูลใหม่</h3>
            <p className="text-sm text-muted-foreground">ราคาเปิด ราคาเพิ่มขั้นต่ำ และเวลาสิ้นสุดจะล็อกหลังสร้างรายการ</p>
          </div>

          <Field label="รหัสการ์ด">
            <div className="relative">
              <Input value={cardCode} onChange={(event) => handleCardCodeChange(event.target.value)} required placeholder="OP01-121" className="pr-10" />
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">{lookupLoading ? "กำลังค้นหาข้อมูลการ์ด..." : "รองรับ OP, EB, PRB และ ST จาก data-cardgame.com"}</span>
          </Field>

          <Field label="ชื่อการ์ด">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={120} placeholder="ชื่อจะขึ้นอัตโนมัติเมื่อพบรหัสการ์ด" />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="การ์ดเกม">
              <Input value={CARD_GAME_NAME} readOnly className="bg-muted" />
            </Field>
            <Field label="ชุด">
              <Select value={category} onValueChange={(value) => setCategory(value as ProductCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeSets.map((set) => (
                    <SelectItem key={set.category} value={set.category}>
                      {set.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="รหัสชุด">
              <Input value={selectedSet?.setCode ?? "OP-01"} readOnly className="bg-muted" />
            </Field>
            <Field label="ระดับ">
              <Select value={rarity} onValueChange={(value) => setRarity(value as ProductRarity)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rarities.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="สภาพสินค้า">
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="อัปโหลดภาพการ์ดจริง">
            <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 text-sm hover:bg-muted">
              <ImagePlus className="size-4" />
              {uploading ? "กำลังอัปโหลด..." : imageUrl ? "เปลี่ยนรูปภาพ" : "เลือกไฟล์รูปภาพ"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </Field>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="ราคาเปิด (บาท)">
              <Input type="number" value={openingPrice} onChange={(event) => setOpeningPrice(event.target.value)} required min={100} />
            </Field>
            <Field label="บิดเพิ่มครั้งละ (บาท)">
              <Input type="number" value={bidIncrement} onChange={(event) => setBidIncrement(event.target.value)} required min={10} />
            </Field>
            <Field label="เวลาสิ้นสุด">
              <Input type="datetime-local" value={auctionEndsAt} onChange={(event) => setAuctionEndsAt(event.target.value)} required />
            </Field>
          </div>

          <Field label="รายละเอียดจากร้านค้า">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              minLength={10}
              maxLength={2000}
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="ระบุรายละเอียดสินค้า จุดเด่น ตำหนิ หรือเงื่อนไขเพิ่มเติม"
            />
          </Field>

          {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
          {message ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

          <Button type="submit" disabled={saving || uploading || lookupLoading}>
            <Trophy data-icon="inline-start" />
            {saving ? "กำลังสร้างประมูล..." : "สร้างรายการประมูล"}
          </Button>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>ตัวอย่างและรายการล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {imageUrl ? (
              <div className="relative aspect-[100/140] overflow-hidden rounded-xl border bg-muted">
                <Image src={imageUrl} alt={title || "ตัวอย่างรูปการ์ด"} fill className="object-cover" sizes="360px" />
              </div>
            ) : (
              <div className="flex aspect-[100/140] items-center justify-center rounded-xl border border-dashed bg-muted/40 text-sm text-muted-foreground">
                รูปจากรหัสการ์ดหรือรูปที่อัปโหลดจะแสดงตรงนี้
              </div>
            )}

            <div className="grid gap-2">
              {managedProducts.slice(0, 8).map((product) => (
                <Link
                  key={product.id}
                  href={product.mode === "AUCTION" ? `/auctions/${product.id}` : `/buy-now/${product.id}`}
                  className="rounded-xl border p-3 transition hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="line-clamp-1">{product.title}</strong>
                      <p className="text-xs text-muted-foreground">
                        {product.cardCode} · {product.rarity}
                      </p>
                    </div>
                    <Badge variant={product.mode === "AUCTION" ? "default" : "secondary"}>{product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{moneyFromCents(product.currentPriceCents)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" />
                      {product.auctionEndsAt ? new Date(product.auctionEndsAt).toLocaleString("th-TH") : "พร้อมขาย"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="grid gap-1.5 text-sm font-medium">
    <span>{label}</span>
    {children}
  </label>
);

const StatusTile = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl border bg-background p-4">
    <span className="text-primary">{icon}</span>
    <strong className="mt-2 block">{value}</strong>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export { ShopManagementPanel };
