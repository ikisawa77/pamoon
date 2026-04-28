"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, BellOff, Clock3, Heart, Mail, Store, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

interface FavoriteItem {
  id: string;
  productId: string;
  emailNotify: boolean;
  notifyOutbid: boolean;
  notifyEndingSoon: boolean;
  disabledAfterAuctionAt: string | null;
  product: {
    id: string;
    title: string;
    cardCode: string;
    setName: string;
    rarity: string;
    mode: "AUCTION" | "BUY";
    currentPriceCents: number;
    nextBidCents: number;
    watcherCount: number;
    auctionEndsAt: string | null;
    imageUrl: string | null;
    sellerShop: {
      name: string;
      slug: string;
    };
  };
}

interface FavoritesClientProps {
  initialFavorites: FavoriteItem[];
  viewerName: string;
}

interface ApiResponse {
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

const formatDate = (value: string | null) => {
  if (!value) {
    return "พร้อมส่ง";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const FavoritesClient = ({ initialFavorites, viewerName }: FavoritesClientProps) => {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [notice, setNotice] = useState("ระบบจะสร้างอีเมลแจ้งเตือนเมื่อมีคนประมูลทับ หรือเมื่อประมูลในรายการโปรดเหลือ 5 นาที");

  const updateFavorite = async (productId: string, patch: Partial<Pick<FavoriteItem, "emailNotify" | "notifyOutbid" | "notifyEndingSoon">>) => {
    setFavorites((current) => current.map((item) => (item.productId === productId ? { ...item, ...patch } : item)));
    const response = await fetch("/api/favorites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ...patch }),
    });
    const result = (await response.json()) as ApiResponse;

    if (!response.ok || !result.ok) {
      setNotice(result.error?.message ?? "บันทึกการแจ้งเตือนไม่สำเร็จ");
      return;
    }

    setNotice("อัปเดตการแจ้งเตือนรายการโปรดแล้ว");
  };

  const removeFavorite = async (productId: string) => {
    const previous = favorites;
    setFavorites((current) => current.filter((item) => item.productId !== productId));
    const response = await fetch(`/api/favorites?productId=${productId}`, { method: "DELETE" });
    const result = (await response.json()) as ApiResponse;

    if (!response.ok || !result.ok) {
      setFavorites(previous);
      setNotice(result.error?.message ?? "ลบรายการโปรดไม่สำเร็จ");
      return;
    }

    setNotice("ลบรายการโปรดแล้ว");
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
            <Button asChild variant="ghost"><Link href="/auctions">ประมูล</Link></Button>
            <Button asChild variant="ghost"><Link href="/buy-now">ซื้อเลย</Link></Button>
            <Button asChild variant="ghost"><Link href="/shops">ร้านค้า</Link></Button>
            <Button asChild variant="secondary"><Link href="/collection">รายการโปรด</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/account">{viewerName}</Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <Badge className="mb-4">Favorites</Badge>
            <h1 className="text-4xl font-black sm:text-6xl">รายการโปรด</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              ติดตามสินค้าที่สนใจ เปิดหรือปิดอีเมลแจ้งเตือนรายใบ และระบบจะหยุดแจ้งเตือนอัตโนมัติหลังจบประมูลถ้าคุณไม่ได้เป็นผู้ชนะ
            </p>
          </div>
          <div className="rounded-2xl border bg-background p-5">
            <div className="flex items-center gap-3">
              <Heart className="text-primary" />
              <div>
                <strong className="block text-2xl">{favorites.length.toLocaleString("th-TH")} รายการ</strong>
                <span className="text-sm text-muted-foreground">{notice}</span>
              </div>
            </div>
          </div>
        </section>

        {favorites.length === 0 ? (
          <section className="mt-8 rounded-2xl border bg-background p-10 text-center">
            <Heart className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold">ยังไม่มีรายการโปรด</h2>
            <p className="mt-2 text-muted-foreground">กดหัวใจบนหน้าประมูลหรือหน้าซื้อเลยเพื่อเริ่มติดตามสินค้า</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild><Link href="/auctions">ดูหน้าประมูล</Link></Button>
              <Button asChild variant="outline"><Link href="/buy-now">ดูสินค้าซื้อเลย</Link></Button>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            {favorites.map((favorite, index) => (
              <article key={favorite.id} className="grid overflow-hidden rounded-2xl border bg-background shadow-sm sm:grid-cols-[180px_minmax(0,1fr)]">
                <div className={cn("product-art relative min-h-56 bg-muted", `object-pos-${(index % 3) + 1}`)}>
                  {favorite.product.imageUrl ? <Image src={favorite.product.imageUrl} alt={favorite.product.title} fill sizes="180px" className="object-cover" /> : null}
                </div>
                <div className="grid gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge>{favorite.product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}</Badge>
                        <Badge variant="outline">{favorite.product.rarity}</Badge>
                      </div>
                      <h2 className="line-clamp-2 font-semibold">{favorite.product.title}</h2>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{favorite.product.cardCode} · {favorite.product.setName}</p>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={() => removeFavorite(favorite.productId)} aria-label="ลบรายการโปรด">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <span className="rounded-xl bg-muted/50 p-3">
                      <strong className="block text-lg text-primary">{money(favorite.product.currentPriceCents)}</strong>
                      ราคาปัจจุบัน
                    </span>
                    <span className="rounded-xl bg-muted/50 p-3">
                      <strong className="block text-lg">{formatDate(favorite.product.auctionEndsAt)}</strong>
                      {favorite.product.mode === "AUCTION" ? "เวลาปิดประมูล" : "สถานะสินค้า"}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-muted-foreground"><Store className="size-4" />{favorite.product.sellerShop.name}</span>
                    <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
                      <span className="inline-flex items-center gap-2"><Mail className="size-4" />แจ้งเตือนผ่านอีเมล</span>
                      <Checkbox checked={favorite.emailNotify} onCheckedChange={(checked) => updateFavorite(favorite.productId, { emailNotify: checked === true })} />
                    </label>
                    {favorite.product.mode === "AUCTION" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
                          <span className="inline-flex items-center gap-2"><Bell className="size-4" />มีคนประมูลทับ</span>
                          <Checkbox checked={favorite.notifyOutbid} onCheckedChange={(checked) => updateFavorite(favorite.productId, { notifyOutbid: checked === true })} />
                        </label>
                        <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
                          <span className="inline-flex items-center gap-2"><Clock3 className="size-4" />เหลือ 5 นาที</span>
                          <Checkbox checked={favorite.notifyEndingSoon} onCheckedChange={(checked) => updateFavorite(favorite.productId, { notifyEndingSoon: checked === true })} />
                        </label>
                      </div>
                    ) : null}
                    {favorite.disabledAfterAuctionAt ? (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-muted p-3 text-muted-foreground">
                        <BellOff className="size-4" />ระบบปิดแจ้งเตือนรายการนี้แล้วหลังจบประมูล
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export { FavoritesClient };
