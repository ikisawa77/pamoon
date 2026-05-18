"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, BellOff, Clock3, Heart, Mail, Store, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AppFooter } from "@/components/shared/AppFooter";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
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
  }).format(value / 100);

const formatDate = (value: string | null) => {
  if (!value) {
    return "เธเธฃเนเธญเธกเธชเนเธ";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const FavoritesClient = ({ initialFavorites, viewerName }: FavoritesClientProps) => {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [notice, setNotice] = useState("เน€เธเธดเธ”เธซเธฃเธทเธญเธเธดเธ”เธญเธตเน€เธกเธฅเนเธเนเธเน€เธ•เธทเธญเธเธชเธณเธซเธฃเธฑเธเธฃเธฒเธขเธเธฒเธฃเธ—เธตเนเธเธธเธ“เธชเธเนเธเนเธ”เนเธเธฒเธเธซเธเนเธฒเธเธตเน");

  const updateFavorite = async (
    productId: string,
    patch: Partial<Pick<FavoriteItem, "emailNotify" | "notifyOutbid" | "notifyEndingSoon">>,
  ) => {
    setFavorites((current) => current.map((item) => (item.productId === productId ? { ...item, ...patch } : item)));

    const response = await fetch("/api/favorites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ...patch }),
    });
    const result = (await response.json()) as ApiResponse;

    if (!response.ok || !result.ok) {
      setNotice(result.error?.message ?? "เธเธฑเธเธ—เธถเธเธเธฒเธฃเนเธเนเธเน€เธ•เธทเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ");
      return;
    }

    setNotice("เธญเธฑเธเน€เธ”เธ•เธเธฒเธฃเนเธเนเธเน€เธ•เธทเธญเธเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”เนเธฅเนเธง");
  };

  const removeFavorite = async (productId: string) => {
    const previous = favorites;
    setFavorites((current) => current.filter((item) => item.productId !== productId));

    const response = await fetch(`/api/favorites?productId=${productId}`, { method: "DELETE" });
    const result = (await response.json()) as ApiResponse;

    if (!response.ok || !result.ok) {
      setFavorites(previous);
      setNotice(result.error?.message ?? "เธฅเธเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”เนเธกเนเธชเธณเน€เธฃเนเธ");
      return;
    }

    setNotice("เธฅเธเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”เนเธฅเนเธง");
  };

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <SimpleAppHeader user={{ displayName: viewerName, role: "MEMBER" }} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="neon-panel grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <Badge className="mb-4">Favorites</Badge>
            <h1 className="text-4xl font-black sm:text-6xl">เธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              เธ•เธดเธ”เธ•เธฒเธกเธเธฒเธฃเนเธ”เธ—เธตเนเธชเธเนเธ เน€เธเธดเธ”เธญเธตเน€เธกเธฅเนเธเนเธเน€เธ•เธทเธญเธเน€เธกเธทเนเธญเธกเธตเธเธเธเธดเธ”เธ—เธฑเธเธซเธฃเธทเธญเน€เธซเธฅเธทเธญ 5 เธเธฒเธ—เธตเธชเธธเธ”เธ—เนเธฒเธข เนเธฅเธฐเธฃเธฐเธเธเธเธฐเธซเธขเธธเธ”เนเธเนเธเน€เธ•เธทเธญเธเธญเธฑเธ•เนเธเธกเธฑเธ•เธดเธซเธฅเธฑเธเธเธเธเธฃเธฐเธกเธนเธฅเธ–เนเธฒเธเธธเธ“เนเธกเนเนเธ”เนเธเธเธฐ
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <Heart className="text-primary" />
              <div>
                <strong className="block text-2xl">{favorites.length.toLocaleString("th-TH")} เธฃเธฒเธขเธเธฒเธฃ</strong>
                <span className="text-sm text-muted-foreground">{notice}</span>
              </div>
            </div>
          </div>
        </section>

        {favorites.length === 0 ? (
          <section className="neon-panel mt-8 p-10 text-center">
            <Heart className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold">เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”</h2>
            <p className="mt-2 text-muted-foreground">เธเธ”เธซเธฑเธงเนเธเธเธเธซเธเนเธฒเธเธฃเธฐเธกเธนเธฅเธซเธฃเธทเธญเธซเธเนเธฒเธเธทเนเธญเน€เธฅเธขเน€เธเธทเนเธญเน€เธฃเธดเนเธกเธ•เธดเธ”เธ•เธฒเธกเธชเธดเธเธเนเธฒ</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild><Link href="/auctions">เธ”เธนเธซเธเนเธฒเธเธฃเธฐเธกเธนเธฅ</Link></Button>
              <Button asChild variant="outline"><Link href="/buy-now">เธ”เธนเธชเธดเธเธเนเธฒเธเธทเนเธญเน€เธฅเธข</Link></Button>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            {favorites.map((favorite, index) => (
              <article key={favorite.id} className="neon-panel grid overflow-hidden sm:grid-cols-[180px_minmax(0,1fr)]">
                <Link
                  href={favorite.product.mode === "AUCTION" ? `/auctions/${favorite.product.id}` : `/buy-now/${favorite.product.id}`}
                  className={cn("product-art relative min-h-56 bg-muted", `object-pos-${(index % 3) + 1}`)}
                >
                  {favorite.product.imageUrl ? (
                    <Image src={favorite.product.imageUrl} alt={favorite.product.title} fill sizes="180px" className="object-cover" />
                  ) : null}
                </Link>
                <div className="grid gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge>{favorite.product.mode === "AUCTION" ? "เธเธฃเธฐเธกเธนเธฅ" : "เธเธทเนเธญเน€เธฅเธข"}</Badge>
                        <Badge variant="outline">{favorite.product.rarity}</Badge>
                      </div>
                      <h2 className="line-clamp-2 font-semibold">{favorite.product.title}</h2>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{favorite.product.cardCode} ยท {favorite.product.setName}</p>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={() => removeFavorite(favorite.productId)} aria-label="เธฅเธเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <span className="rounded-xl bg-white/5 p-3">
                      <strong className="block text-lg text-primary">{money(favorite.product.currentPriceCents)}</strong>
                      เธฃเธฒเธเธฒเธเธฑเธเธเธธเธเธฑเธ
                    </span>
                    <span className="rounded-xl bg-white/5 p-3">
                      <strong className="block text-lg">{formatDate(favorite.product.auctionEndsAt)}</strong>
                      {favorite.product.mode === "AUCTION" ? "เน€เธงเธฅเธฒเธเธดเธ”เธเธฃเธฐเธกเธนเธฅ" : "เธชเธ–เธฒเธเธฐเธชเธดเธเธเนเธฒ"}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-muted-foreground"><Store className="size-4" />{favorite.product.sellerShop.name}</span>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                      <span className="inline-flex items-center gap-2"><Mail className="size-4" />เนเธเนเธเน€เธ•เธทเธญเธเธเนเธฒเธเธญเธตเน€เธกเธฅ</span>
                      <Checkbox checked={favorite.emailNotify} onCheckedChange={(checked) => updateFavorite(favorite.productId, { emailNotify: checked === true })} />
                    </label>
                    {favorite.product.mode === "AUCTION" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                          <span className="inline-flex items-center gap-2"><Bell className="size-4" />เธกเธตเธเธเธเธดเธ”เธ—เธฑเธ</span>
                          <Checkbox checked={favorite.notifyOutbid} onCheckedChange={(checked) => updateFavorite(favorite.productId, { notifyOutbid: checked === true })} />
                        </label>
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                          <span className="inline-flex items-center gap-2"><Clock3 className="size-4" />เน€เธซเธฅเธทเธญ 5 เธเธฒเธ—เธต</span>
                          <Checkbox checked={favorite.notifyEndingSoon} onCheckedChange={(checked) => updateFavorite(favorite.productId, { notifyEndingSoon: checked === true })} />
                        </label>
                      </div>
                    ) : null}
                    {favorite.disabledAfterAuctionAt ? (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 p-3 text-muted-foreground">
                        <BellOff className="size-4" />เธฃเธฐเธเธเธเธดเธ”เนเธเนเธเน€เธ•เธทเธญเธเธฃเธฒเธขเธเธฒเธฃเธเธตเนเนเธฅเนเธงเธซเธฅเธฑเธเธเธเธเธฃเธฐเธกเธนเธฅ
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      <AppFooter />
    </div>
  );
};

export { FavoritesClient };


