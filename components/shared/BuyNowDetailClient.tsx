"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { CARD_GAME_NAME } from "@/lib/card-catalog";
import type { ViewerSummary } from "@/types/marketplace";

interface BuyNowProduct {
  id: string;
  title: string;
  cardCode: string;
  setCode: string;
  setName: string;
  rarity: string;
  conditionLabel: string;
  description: string | null;
  imageUrl: string | null;
  currentPriceCents: number;
  watcherCount: number;
  sellerShop: {
    name: string;
    slug: string;
    rating: number;
    reviewCount: number;
  };
}

interface BuyNowDetailClientProps {
  product: BuyNowProduct;
  viewer: ViewerSummary;
}

interface CartLine {
  id: string;
  title: string;
  seller: string;
  rarity: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
}

const CART_STORAGE_KEY = "bidcard.cart";

const money = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value / 100);

const readCart = () => {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
};

const writeCart = (lines: CartLine[]) => {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("bidcard-cart-updated"));
};

const BuyNowDetailClient = ({ product, viewer }: BuyNowDetailClientProps) => {
  const [notice, setNotice] = useState("พร้อมเพิ่มลงตะกร้า ตรวจรายละเอียดก่อนสั่งซื้อได้เลย");
  const [isFavorited, setIsFavorited] = useState(false);

  const productFacts = useMemo(
    () => [
      { label: "การ์ดเกม", value: CARD_GAME_NAME },
      { label: "ชุด", value: `${product.setCode} ${product.setName}` },
      { label: "รหัสการ์ด", value: product.cardCode },
      { label: "ระดับ", value: product.rarity },
      { label: "สภาพสินค้า", value: product.conditionLabel },
      { label: "ร้านค้า", value: product.sellerShop.name },
    ],
    [product],
  );

  const addToCart = () => {
    const cart = readCart();
    const existing = cart.find((line) => line.id === product.id);
    const nextCart = existing
      ? cart.map((line) => (line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line))
      : [
          ...cart,
          {
            id: product.id,
            title: product.title,
            seller: product.sellerShop.name,
            rarity: product.rarity,
            priceCents: product.currentPriceCents,
            imageUrl: product.imageUrl,
            quantity: 1,
          },
        ];

    writeCart(nextCart);
    setNotice(`เพิ่ม ${product.title} ลงตะกร้าแล้ว`);
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <span className="text-xl font-black tracking-tight">BidCard TH</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost">
              <Link href="/auctions">ประมูล</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/buy-now">ซื้อเลย</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/shops">ร้านค้า</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/collection">รายการโปรด</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/account">{viewer.displayName}</Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Button asChild variant="ghost" size="sm" className="pl-0">
            <Link href="/buy-now">
              <ArrowLeft className="size-4" />
              กลับไปหน้าซื้อเลย
            </Link>
          </Button>
          <ChevronRight className="size-4" />
          <span>{product.setName}</span>
          <ChevronRight className="size-4" />
          <span className="font-semibold text-slate-950">{product.title}</span>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-white bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,.10)]">
            <div className="relative overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_20%_0%,#fff7d6,transparent_28%),linear-gradient(145deg,#f8fafc,#e2e8f0)] p-4">
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                <Badge className="bg-slate-950 text-white hover:bg-slate-950">ซื้อเลย</Badge>
                <Badge variant="secondary">{product.rarity}</Badge>
              </div>
              <div className="relative mx-auto aspect-[100/140] max-h-[660px] overflow-hidden rounded-2xl">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    sizes="(min-width: 1280px) 520px, 100vw"
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">ไม่มีรูปสินค้า</div>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{CARD_GAME_NAME}</Badge>
                <Badge variant="outline">{product.setCode}</Badge>
                <Badge variant="outline">{product.conditionLabel}</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">{product.title}</h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                การ์ดพร้อมส่งจากร้านค้าที่ผ่านการอนุมัติ เหมาะสำหรับนักสะสมที่ต้องการซื้อทันทีโดยไม่ต้องรอจบประมูล
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {productFacts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-semibold uppercase text-slate-500">{fact.label}</span>
                  <strong className="mt-1 block text-slate-950">{fact.value}</strong>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black">รายละเอียดจากร้านค้า</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {product.description ??
                  "สินค้าตัวอย่างสำหรับทดสอบ marketplace ระบุข้อมูลครบทั้งรหัสการ์ด ชุด ระดับ และสภาพสินค้า ก่อนเพิ่มลงตะกร้าผู้ซื้อสามารถตรวจสอบรายละเอียดทั้งหมดได้จากหน้านี้"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TrustItem icon={<ShieldCheck className="size-5" />} title="Escrow" detail="กันเงินในระบบจนกว่าส่งของ" />
              <TrustItem icon={<Truck className="size-5" />} title="ส่งภายใน 48 ชม." detail="ร้านค้าต้องจัดส่งตาม SLA" />
              <TrustItem icon={<MessageCircle className="size-5" />} title="เปิดแชทหลังชำระ" detail="คุยกับร้านค้าได้โดยตรง" />
            </div>
          </section>

          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.10)] xl:sticky xl:top-24">
            <Link
              href={`/shops/${product.sellerShop.slug}`}
              className="mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <span className="inline-flex items-center gap-3 font-bold">
                <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Store className="size-5" />
                </span>
                {product.sellerShop.name}
              </span>
              <span className="text-right text-xs text-slate-500">
                <strong className="block text-sm text-slate-950">{product.sellerShop.rating.toFixed(1)}/5</strong>
                {product.sellerShop.reviewCount.toLocaleString("th-TH")} รีวิว
              </span>
            </Link>

            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <span className="text-sm text-slate-300">ราคาซื้อเลย</span>
              <strong className="mt-2 block text-4xl font-black text-amber-300">{money(product.currentPriceCents)}</strong>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                <span className="text-slate-300">ผู้ติดตาม</span>
                <strong className="text-right">{product.watcherCount.toLocaleString("th-TH")} คน</strong>
                <span className="text-slate-300">สถานะ</span>
                <strong className="text-right text-emerald-300">พร้อมขาย</strong>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <Button type="button" size="lg" onClick={addToCart} className="h-12">
                <ShoppingCart className="size-5" />
                เพิ่มลงตะกร้า
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12">
                <Link href="/cart">
                  <ShoppingBag className="size-5" />
                  ไปตะกร้าสินค้า
                </Link>
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsFavorited((current) => !current)}>
                <Heart className={isFavorited ? "size-4 fill-red-500 text-red-500" : "size-4"} />
                {isFavorited ? "อยู่ในรายการโปรดแล้ว" : "เพิ่มรายการโปรด"}
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0" />
                {notice}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

const TrustItem = ({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-950 text-white">{icon}</div>
    <strong>{title}</strong>
    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
  </div>
);

export { BuyNowDetailClient };
