"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, ShoppingCart, Store } from "lucide-react";
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
  })
    .format(value / 100)
    .replace("THB", "฿");

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
  const [notice, setNotice] = useState("ตรวจสอบรายละเอียดการ์ดก่อนเพิ่มลงตะกร้า");

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
    <div className="min-h-screen bg-[#f6f6f2] text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground">*</div>
            <strong className="text-xl">BidCard TH</strong>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost"><Link href="/auctions">ประมูล</Link></Button>
            <Button asChild variant="secondary"><Link href="/buy-now">ซื้อเลย</Link></Button>
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge>Buy Now</Badge>
            <h1 className="mt-3 text-4xl font-black">{product.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{CARD_GAME_NAME} · {product.setCode} {product.setName}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/cart">
              <ShoppingCart data-icon="inline-start" />
              ไปตะกร้า
            </Link>
          </Button>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)_360px]">
          <div className="rounded-2xl bg-muted p-5">
            <div className="relative mx-auto aspect-[100/140] max-h-[620px] overflow-hidden rounded-xl bg-background">
              {product.imageUrl ? <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1024px) 520px, 100vw" className="object-contain" priority /> : null}
            </div>
          </div>

          <section className="space-y-4">
            <InfoRow label="การ์ดเกม" value={CARD_GAME_NAME} />
            <InfoRow label="ชุด" value={`${product.setCode} ${product.setName}`} />
            <InfoRow label="รหัสการ์ด" value={product.cardCode} />
            <InfoRow label="ระดับ" value={product.rarity} />
            <InfoRow label="สภาพสินค้า" value={product.conditionLabel} />
            <InfoRow label="ร้านค้า" value={product.sellerShop.name} />
            <p className="pt-3 text-sm leading-7 text-muted-foreground">{product.description ?? "การ์ดพร้อมส่งจากร้านค้าที่ผ่านการอนุมัติ ตรวจสอบรายละเอียดและสภาพสินค้าก่อนเพิ่มลงตะกร้า"}</p>
          </section>

          <aside className="h-fit rounded-2xl border bg-background p-5 shadow-sm">
            <Link href={`/shops/${product.sellerShop.slug}`} className="mb-5 flex items-center justify-between rounded-xl bg-muted p-3">
              <span className="inline-flex items-center gap-2"><Store className="size-4" />{product.sellerShop.name}</span>
              <span className="text-sm text-muted-foreground">{product.sellerShop.rating.toFixed(1)} ({product.sellerShop.reviewCount})</span>
            </Link>
            <div className="rounded-2xl bg-muted p-5">
              <span className="text-sm text-muted-foreground">ราคาซื้อเลย</span>
              <strong className="block text-3xl text-primary">{money(product.currentPriceCents)}</strong>
              <span className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Heart className="size-4" />
                ติดตาม {product.watcherCount.toLocaleString("th-TH")} คน
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              <Button type="button" onClick={addToCart}>
                <ShoppingCart data-icon="inline-start" />
                เพิ่มลงตะกร้า
              </Button>
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-primary" />
                {notice}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-sm">
    <strong>{label}:</strong>
    <span className="text-muted-foreground">{value}</span>
  </div>
);

export { BuyNowDetailClient };
