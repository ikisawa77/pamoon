"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Heart,
  ShieldCheck,
  Share2,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppFooter } from "@/components/shared/AppFooter";
import { useAppConfirmDialog } from "@/components/shared/AppConfirmDialog";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
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
  }).format(value / 100);

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
  const { confirm, confirmDialog } = useAppConfirmDialog();
  const isGuest = viewer.role === "GUEST";
  const remaining = useMemo(() => getRemaining(product.auctionEndsAt, now), [now, product.auctionEndsAt]);
  const topBid = product.bids[0];

  const infoRows = [
    ["ชื่อ", product.title],
    ["การ์ดเกม", "One Piece Card Game (Japanese)"],
    ["ชุด", product.setName],
    ["รหัสชุด", product.setCode],
    ["รหัสการ์ด", product.cardCode],
    ["ระดับ", product.rarity],
    ["สภาพสินค้า", product.conditionLabel],
    ["ร้านค้า", product.sellerShop.name],
  ];

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
    const confirmed = await confirm({
      title: "ยืนยันการบิด",
      description: "ระบบจะบันทึกราคาประมูลของคุณทันที และแจ้งเตือนเมื่อมีสมาชิกคนอื่นบิดทับ",
      confirmLabel: "ยืนยันบิด",
      cancelLabel: "ยกเลิก",
      tone: "bid",
      details: [
        { label: "การ์ด", value: product.title },
        { label: "ราคาเสนอ", value: money(amountCents) },
      ],
    });

    if (!confirmed) {
      setNotice("ยกเลิกการบิดแล้ว");
      return;
    }

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
    setNotice("เสนอราคาสำเร็จ ตอนนี้คุณเป็นผู้เสนอราคาสูงสุด");
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-slate-950">
      <SimpleAppHeader user={viewer} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Badge>Live Auction</Badge>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{product.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{product.cardCode} • {product.setName} • {product.conditionLabel}</p>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="แชร์">
            <Share2 className="size-4" />
          </Button>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,760px)_420px]">
          <div className="min-w-0 space-y-6">
            <div className="rounded-[28px] bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.10)]">
              <div className="relative mx-auto aspect-[100/140] max-h-[720px] overflow-hidden rounded-2xl bg-slate-100">
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1024px) 720px, 100vw" className="object-contain" priority />
                ) : null}
              </div>
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">รายละเอียดการ์ด</h2>
                  <p className="text-sm text-slate-500">ข้อมูลจากร้านค้าและคลังการ์ดที่ใช้ลงประมูล</p>
                </div>
                <Badge variant="outline">{product.rarity}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {infoRows.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                    <strong className="mt-1 block leading-6">{value}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600">
                {product.description ?? "ข้อมูลตัวอย่างสำหรับทดสอบระบบประมูล ตรวจสอบรูปสินค้าและรายละเอียดก่อนเสนอราคา"}
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.10)] lg:sticky lg:top-24">
            <Link href={`/shops/${product.sellerShop.slug}`} className="mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100">
              <span className="inline-flex items-center gap-2"><Store className="size-4" />ขายโดย: {product.sellerShop.name}</span>
              <ChevronRight className="size-4" />
            </Link>
            <div className="rounded-3xl bg-slate-950 p-5 text-center text-white">
              <span className="text-sm text-slate-300">ราคาปัจจุบัน</span>
              <strong className="mt-2 block text-3xl text-primary">{topBid ? money(product.currentPriceCents) : "ยังไม่มีผู้เข้าร่วมประมูล"}</strong>
            </div>
            <CountdownPill remaining={remaining} />
            <p className="mt-3 text-center text-xs leading-6 text-slate-500">
              หากมี bid ในช่วง 15 วินาทีสุดท้าย ระบบจะต่อเวลาอีก 15 วินาทีอัตโนมัติ ถ้าไม่มีคนบิดต่อ ผู้เสนอราคาล่าสุดจะชนะเมื่อหมดเวลา
            </p>
            <div className="mt-5 grid gap-3">
              <label className="text-sm font-semibold" htmlFor="bidAmount">ใส่ราคาประมูลของคุณ</label>
              <Input
                id="bidAmount"
                type="number"
                min={Math.round(product.nextBidCents / 100)}
                value={bidAmount}
                onChange={(event) => setBidAmount(event.target.value)}
                placeholder={`ยอดขั้นต่ำ ${money(product.nextBidCents)}`}
              />
              <Button type="button" className="h-11" onClick={submitBid}>บิด</Button>
              <Button type="button" variant="outline" className={cn(favorite && "border-primary text-primary")} onClick={toggleFavorite}>
                <Heart className={cn("size-4", favorite && "fill-current")} data-icon="inline-start" />
                {favorite ? "ติดตามอยู่" : "เพิ่มรายการโปรด"}
              </Button>
              <p className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{notice}</p>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <TrustRow icon={<Bell className="size-4" />} text="แจ้งเตือนเมื่อมีคนบิดทับและช่วง 5 นาทีสุดท้าย" />
              <TrustRow icon={<ShieldCheck className="size-4" />} text="ผู้ชนะต้องชำระเงินภายใน 24 ชั่วโมง" />
              <TrustRow icon={<CheckCircle2 className="size-4" />} text="ร้านค้าต้องจัดส่งภายใน SLA หลังชำระเงิน" />
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">ประวัติการประมูล</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3">ผู้ร่วมประมูล</th>
                    <th className="p-3">ราคาที่ประมูล</th>
                    <th className="p-3">วัน/เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {product.bids.length === 0 ? (
                    <tr><td className="p-6 text-center text-slate-500" colSpan={3}>ยังไม่มีประวัติการประมูล</td></tr>
                  ) : (
                    product.bids.map((bid) => (
                      <tr key={bid.id} className="border-t">
                        <td className="p-3 font-medium">{bid.bidderName}</td>
                        <td className="p-3 text-primary">{money(bid.amountCents)}</td>
                        <td className="p-3 text-slate-500">{formatDateTime(bid.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">สรุปการขาย</h2>
              <span className="text-sm font-semibold text-primary">ราคาเปิด {money(product.openingPriceCents)}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric label="ผู้ติดตาม" value={`${product.watcherCount.toLocaleString("th-TH")} คน`} />
              <Metric label="รีวิวร้าน" value={`${product.sellerShop.rating.toFixed(1)} (${product.sellerShop.reviewCount})`} />
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
      {confirmDialog}
    </div>
  );
};

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

const TrustRow = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <span className="inline-flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-slate-600">
    <span className="mt-0.5 text-primary">{icon}</span>
    {text}
  </span>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <span className="rounded-2xl bg-slate-50 p-4">
    <strong className="block text-lg">{value}</strong>
    <span className="text-slate-500">{label}</span>
  </span>
);

export { AuctionDetailClient };


