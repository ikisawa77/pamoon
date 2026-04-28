"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Heart, Share2, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";
import type { ViewerSummary } from "@/types/marketplace";

interface BidHistoryItem {
  id: string;
  bidderName: string;
  amountCents: number;
  status: string;
  createdAt: string;
}

interface AuctionDetailProduct {
  id: string;
  title: string;
  cardCode: string;
  setCode: string;
  setName: string;
  rarity: string;
  conditionLabel: string;
  description: string | null;
  imageUrl: string | null;
  openingPriceCents: number;
  currentPriceCents: number;
  nextBidCents: number;
  watcherCount: number;
  auctionEndsAt: string | null;
  sellerShop: {
    name: string;
    slug: string;
    rating: number;
    reviewCount: number;
  };
  bids: BidHistoryItem[];
  isFavorite: boolean;
}

interface AuctionDetailClientProps {
  product: AuctionDetailProduct;
  viewer: ViewerSummary;
}

interface BidResponse {
  ok: boolean;
  product?: {
    currentPriceCents: number;
    nextBidCents: number;
    auctionEndsAt: string | null;
  };
  error?: {
    message: string;
  };
}

interface FavoriteResponse {
  ok: boolean;
  error?: {
    message: string;
  };
}

const money = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getRemaining = (auctionEndsAt: string | null, now: number) => {
  if (!auctionEndsAt) return null;

  const totalSeconds = Math.max(0, Math.floor((new Date(auctionEndsAt).getTime() - now) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
};

const AuctionDetailClient = ({ product: initialProduct, viewer }: AuctionDetailClientProps) => {
  const [product, setProduct] = useState(initialProduct);
  const [bidAmount, setBidAmount] = useState(String(Math.round(initialProduct.nextBidCents / 100)));
  const [favorite, setFavorite] = useState(initialProduct.isFavorite);
  const [notice, setNotice] = useState("ใส่ราคาที่ต้องการเสนอ ระบบจะแจ้งเตือนผ่านกระดิ่งและอีเมลเมื่อมีคนบิดทับ");
  const [now, setNow] = useState(() => Date.now());
  const isGuest = viewer.role === "GUEST";
  const remaining = useMemo(() => getRemaining(product.auctionEndsAt, now), [now, product.auctionEndsAt]);
  const topBid = product.bids[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleFavorite = async () => {
    if (isGuest) {
      setNotice("กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด");
      return;
    }

    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    const response = await fetch(nextFavorite ? "/api/favorites" : `/api/favorites?productId=${product.id}`, {
      method: nextFavorite ? "POST" : "DELETE",
      headers: nextFavorite ? { "Content-Type": "application/json" } : undefined,
      body: nextFavorite
        ? JSON.stringify({
            productId: product.id,
            emailNotify: true,
            notifyOutbid: true,
            notifyEndingSoon: true,
          })
        : undefined,
    });
    const result = (await response.json()) as FavoriteResponse;

    if (!response.ok || !result.ok) {
      setFavorite(!nextFavorite);
      setNotice(result.error?.message ?? "บันทึกรายการโปรดไม่สำเร็จ");
      return;
    }

    setNotice(nextFavorite ? "เพิ่มรายการโปรดและเปิดแจ้งเตือนอีเมลแล้ว" : "ลบออกจากรายการโปรดแล้ว");
  };

  const submitBid = async () => {
    if (isGuest) {
      setNotice("กรุณาเข้าสู่ระบบก่อนเข้าร่วมประมูล");
      return;
    }

    const amountCents = Math.round(Number(bidAmount) * 100);
    const response = await fetch("/api/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, amountCents }),
    });
    const result = (await response.json()) as BidResponse;

    if (!response.ok || !result.ok || !result.product) {
      setNotice(result.error?.message ?? "เสนอราคาไม่สำเร็จ");
      return;
    }

    const newBid: BidHistoryItem = {
      id: `local-${Date.now()}`,
      bidderName: viewer.displayName,
      amountCents,
      status: "WINNING",
      createdAt: new Date().toISOString(),
    };

    setProduct((current) => ({
      ...current,
      currentPriceCents: result.product?.currentPriceCents ?? current.currentPriceCents,
      nextBidCents: result.product?.nextBidCents ?? current.nextBidCents,
      auctionEndsAt: result.product?.auctionEndsAt ?? current.auctionEndsAt,
      bids: [newBid, ...current.bids.map((bid) => (bid.status === "WINNING" ? { ...bid, status: "OUTBID" } : bid))],
    }));
    setBidAmount(String(Math.round((result.product.nextBidCents ?? amountCents) / 100)));
    setNotice("เสนอราคาสำเร็จ คุณเป็นผู้เสนอราคาสูงสุดในตอนนี้");
  };

  return (
    <div className="min-h-screen bg-[#f6f6f2] text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground">★</div>
            <strong className="text-xl">BidCard TH</strong>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Button asChild variant="secondary"><Link href="/auctions">ประมูล</Link></Button>
            <Button asChild variant="ghost"><Link href="/buy-now">ซื้อเลย</Link></Button>
            <Button asChild variant="ghost"><Link href="/shops">ร้านค้า</Link></Button>
            <Button asChild variant="ghost"><Link href="/collection">รายการโปรด</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/account">{viewer.displayName}</Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Badge>Live Auction</Badge>
            <h1 className="mt-3 text-4xl font-black">{product.title}</h1>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="แชร์">
            <Share2 className="size-4" />
          </Button>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)_420px]">
          <div className="rounded-2xl bg-muted p-5">
            <div className="product-art relative mx-auto aspect-[100/140] max-h-[620px] overflow-hidden rounded-xl bg-background">
              {product.imageUrl ? <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-contain" priority /> : null}
            </div>
          </div>

          <section className="space-y-4">
            <InfoRow label="ชื่อ" value={product.title} />
            <InfoRow label="การ์ดเกม" value="One Piece Card Game (Japanese)" />
            <InfoRow label="ชุด" value={product.setName} />
            <InfoRow label="รหัสชุด" value={product.setCode} />
            <InfoRow label="รหัสการ์ด" value={product.cardCode} />
            <InfoRow label="ระดับ" value={product.rarity} />
            <InfoRow label="สภาพสินค้า" value={product.conditionLabel} />
            <InfoRow label="ร้านค้า" value={product.sellerShop.name} />
            <p className="pt-3 text-sm leading-7 text-muted-foreground">{product.description ?? "การ์ดพร้อมเข้าร่วมประมูล ตรวจสอบรูปและรายละเอียดก่อนเสนอราคา"}</p>
          </section>

          <aside className="h-fit rounded-2xl border bg-background p-5 shadow-sm">
            <Link href={`/shops/${product.sellerShop.slug}`} className="mb-5 flex items-center justify-between rounded-xl bg-muted p-3">
              <span className="inline-flex items-center gap-2"><Store className="size-4" />ขายโดย: {product.sellerShop.name}</span>
              <ChevronRight className="size-4" />
            </Link>
            <div className="rounded-2xl bg-muted p-5 text-center">
              <span className="text-sm text-muted-foreground">ราคาปัจจุบัน</span>
              <strong className="block text-3xl text-primary">{topBid ? money(product.currentPriceCents) : "ยังไม่มีผู้เข้าร่วมประมูล"}</strong>
            </div>
            <CountdownPill remaining={remaining} />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              เงื่อนไข: หากมี bid ในช่วง 15 วินาทีสุดท้าย ระบบจะต่อเวลาอีก 15 วินาทีอัตโนมัติ หากไม่มีคนบิดต่อ ผู้เสนอราคาคนล่าสุดจะชนะเมื่อหมดเวลา
            </p>
            <div className="mt-5 grid gap-3">
              <label className="text-sm font-semibold" htmlFor="bidAmount">ใส่ราคาประมูลของคุณ</label>
              <Input id="bidAmount" type="number" min={Math.round(product.nextBidCents / 100)} value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} placeholder={`ยอดขั้นต่ำ ${money(product.nextBidCents)}`} />
              <Button type="button" onClick={submitBid}>บิด</Button>
              <Button type="button" variant="outline" className={cn(favorite && "border-primary text-primary")} onClick={toggleFavorite}>
                <Heart className={cn("size-4", favorite && "fill-current")} data-icon="inline-start" />
                {favorite ? "ติดตามอยู่" : "เพิ่มรายการโปรด"}
              </Button>
              <p className="text-sm text-muted-foreground">{notice}</p>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border bg-background p-5 shadow-sm">
            <h2 className="text-2xl font-bold">ประวัติการประมูล</h2>
            <div className="mt-5 overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3">ผู้ร่วมประมูล</th>
                    <th className="p-3">ราคาที่ประมูล</th>
                    <th className="p-3">วัน/เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {product.bids.length === 0 ? (
                    <tr><td className="p-6 text-center text-muted-foreground" colSpan={3}>ยังไม่มีประวัติการประมูล</td></tr>
                  ) : (
                    product.bids.map((bid) => (
                      <tr key={bid.id} className="border-t">
                        <td className="p-3 font-medium">{bid.bidderName}</td>
                        <td className="p-3 text-primary">{money(bid.amountCents)}</td>
                        <td className="p-3 text-muted-foreground">{formatDateTime(bid.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">สรุปการขาย</h2>
              <span className="text-sm font-semibold text-primary">ราคาเปิด {money(product.openingPriceCents)}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric label="ผู้ติดตาม" value={`${product.watcherCount.toLocaleString("th-TH")} คน`} />
              <Metric label="รีวิวร้าน" value={`${product.sellerShop.rating.toFixed(1)} (${product.sellerShop.reviewCount})`} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-sm">
    <strong>{label}:</strong>
    <span className="text-muted-foreground">{value}</span>
  </div>
);

const CountdownPill = ({ remaining }: { remaining: ReturnType<typeof getRemaining> }) => (
  <div className="mt-5 grid grid-cols-4 rounded-full bg-[#191919] px-3 py-3 text-center text-white">
    {[
      ["วัน", remaining?.days ?? 0],
      ["ชั่วโมง", remaining?.hours ?? 0],
      ["นาที", remaining?.minutes ?? 0],
      ["วินาที", remaining?.seconds ?? 0],
    ].map(([label, value]) => (
      <span key={label} className="border-r border-white/15 last:border-r-0">
        <strong className="block text-base leading-none">{String(value).padStart(2, "0")}</strong>
        <span className="text-[10px] text-white/65">{label}</span>
      </span>
    ))}
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <span className="rounded-xl bg-muted p-3">
    <strong className="block text-lg">{value}</strong>
    <span className="text-muted-foreground">{label}</span>
  </span>
);

export { AuctionDetailClient };
