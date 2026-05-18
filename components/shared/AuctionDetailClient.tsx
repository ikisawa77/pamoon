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
  const [notice, setNotice] = useState("เนเธชเนเธฃเธฒเธเธฒเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃเน€เธชเธเธญ เธฃเธฐเธเธเธเธฐเนเธเนเธเน€เธ•เธทเธญเธเธเนเธฒเธเธเธฃเธฐเธ”เธดเนเธเนเธฅเธฐเธญเธตเน€เธกเธฅเน€เธกเธทเนเธญเธกเธตเธเธเธเธดเธ”เธ—เธฑเธ");
  const [now, setNow] = useState(() => Date.now());
  const { confirm, confirmDialog } = useAppConfirmDialog();
  const isGuest = viewer.role === "GUEST";
  const remaining = useMemo(() => getRemaining(product.auctionEndsAt, now), [now, product.auctionEndsAt]);
  const topBid = product.bids[0];

  const infoRows = [
    ["เธเธทเนเธญ", product.title],
    ["เธเธฒเธฃเนเธ”เน€เธเธก", "One Piece Card Game (Japanese)"],
    ["เธเธธเธ”", product.setName],
    ["เธฃเธซเธฑเธชเธเธธเธ”", product.setCode],
    ["เธฃเธซเธฑเธชเธเธฒเธฃเนเธ”", product.cardCode],
    ["เธฃเธฐเธ”เธฑเธ", product.rarity],
    ["เธชเธ เธฒเธเธชเธดเธเธเนเธฒ", product.conditionLabel],
    ["เธฃเนเธฒเธเธเนเธฒ", product.sellerShop.name],
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleFavorite = async () => {
    if (isGuest) {
      setNotice("เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”");
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
      setNotice(result.error?.message ?? "เธเธฑเธเธ—เธถเธเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”เนเธกเนเธชเธณเน€เธฃเนเธ");
      return;
    }

    setNotice(nextFavorite ? "เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”เนเธฅเธฐเน€เธเธดเธ”เนเธเนเธเน€เธ•เธทเธญเธเธญเธตเน€เธกเธฅเนเธฅเนเธง" : "เธฅเธเธญเธญเธเธเธฒเธเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”เนเธฅเนเธง");
  };

  const submitBid = async () => {
    if (isGuest) {
      setNotice("เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเน€เธเนเธฒเธฃเนเธงเธกเธเธฃเธฐเธกเธนเธฅ");
      return;
    }

    const amountCents = Math.round(Number(bidAmount) * 100);
    const confirmed = await confirm({
      title: "เธขเธทเธเธขเธฑเธเธเธฒเธฃเธเธดเธ”",
      description: "เธฃเธฐเธเธเธเธฐเธเธฑเธเธ—เธถเธเธฃเธฒเธเธฒเธเธฃเธฐเธกเธนเธฅเธเธญเธเธเธธเธ“เธ—เธฑเธเธ—เธต เนเธฅเธฐเนเธเนเธเน€เธ•เธทเธญเธเน€เธกเธทเนเธญเธกเธตเธชเธกเธฒเธเธดเธเธเธเธญเธทเนเธเธเธดเธ”เธ—เธฑเธ",
      confirmLabel: "เธขเธทเธเธขเธฑเธเธเธดเธ”",
      cancelLabel: "เธขเธเน€เธฅเธดเธ",
      tone: "bid",
      details: [
        { label: "เธเธฒเธฃเนเธ”", value: product.title },
        { label: "เธฃเธฒเธเธฒเน€เธชเธเธญ", value: money(amountCents) },
      ],
    });

    if (!confirmed) {
      setNotice("เธขเธเน€เธฅเธดเธเธเธฒเธฃเธเธดเธ”เนเธฅเนเธง");
      return;
    }

    const response = await fetch("/api/bids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, amountCents }),
    });
    const result = (await response.json()) as BidResponse;

    if (!response.ok || !result.ok || !result.product) {
      setNotice(result.error?.message ?? "เน€เธชเธเธญเธฃเธฒเธเธฒเนเธกเนเธชเธณเน€เธฃเนเธ");
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
    setNotice("เน€เธชเธเธญเธฃเธฒเธเธฒเธชเธณเน€เธฃเนเธ เธ•เธญเธเธเธตเนเธเธธเธ“เน€เธเนเธเธเธนเนเน€เธชเธเธญเธฃเธฒเธเธฒเธชเธนเธเธชเธธเธ”");
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-slate-950">
      <SimpleAppHeader user={viewer} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Badge>Live Auction</Badge>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{product.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{product.cardCode} ยท {product.setName} ยท {product.conditionLabel}</p>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="เนเธเธฃเน">
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
                  <h2 className="text-2xl font-black">เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธฃเนเธ”</h2>
                  <p className="text-sm text-slate-500">เธเนเธญเธกเธนเธฅเธเธฒเธเธฃเนเธฒเธเธเนเธฒเนเธฅเธฐเธเธฅเธฑเธเธเธฒเธฃเนเธ”เธ—เธตเนเนเธเนเธฅเธเธเธฃเธฐเธกเธนเธฅ</p>
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
                {product.description ?? "เธเนเธญเธกเธนเธฅเธ•เธฑเธงเธญเธขเนเธฒเธเธชเธณเธซเธฃเธฑเธเธ—เธ”เธชเธญเธเธฃเธฐเธเธเธเธฃเธฐเธกเธนเธฅ เธ•เธฃเธงเธเธชเธญเธเธฃเธนเธเธชเธดเธเธเนเธฒเนเธฅเธฐเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเนเธญเธเน€เธชเธเธญเธฃเธฒเธเธฒ"}
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,.10)] lg:sticky lg:top-24">
            <Link href={`/shops/${product.sellerShop.slug}`} className="mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 transition hover:bg-slate-100">
              <span className="inline-flex items-center gap-2"><Store className="size-4" />เธเธฒเธขเนเธ”เธข: {product.sellerShop.name}</span>
              <ChevronRight className="size-4" />
            </Link>
            <div className="rounded-3xl bg-slate-950 p-5 text-center text-white">
              <span className="text-sm text-slate-300">เธฃเธฒเธเธฒเธเธฑเธเธเธธเธเธฑเธ</span>
              <strong className="mt-2 block text-3xl text-primary">{topBid ? money(product.currentPriceCents) : "เธขเธฑเธเนเธกเนเธกเธตเธเธนเนเน€เธเนเธฒเธฃเนเธงเธกเธเธฃเธฐเธกเธนเธฅ"}</strong>
            </div>
            <CountdownPill remaining={remaining} />
            <p className="mt-3 text-center text-xs leading-6 text-slate-500">
              เธซเธฒเธเธกเธต bid เนเธเธเนเธงเธ 15 เธงเธดเธเธฒเธ—เธตเธชเธธเธ”เธ—เนเธฒเธข เธฃเธฐเธเธเธเธฐเธ•เนเธญเน€เธงเธฅเธฒเธญเธตเธ 15 เธงเธดเธเธฒเธ—เธตเธญเธฑเธ•เนเธเธกเธฑเธ•เธด เธ–เนเธฒเนเธกเนเธกเธตเธเธเธเธดเธ”เธ•เนเธญ เธเธนเนเน€เธชเธเธญเธฃเธฒเธเธฒเธฅเนเธฒเธชเธธเธ”เธเธฐเธเธเธฐเน€เธกเธทเนเธญเธซเธกเธ”เน€เธงเธฅเธฒ
            </p>
            <div className="mt-5 grid gap-3">
              <label className="text-sm font-semibold" htmlFor="bidAmount">เนเธชเนเธฃเธฒเธเธฒเธเธฃเธฐเธกเธนเธฅเธเธญเธเธเธธเธ“</label>
              <Input
                id="bidAmount"
                type="number"
                min={Math.round(product.nextBidCents / 100)}
                value={bidAmount}
                onChange={(event) => setBidAmount(event.target.value)}
                placeholder={`เธขเธญเธ”เธเธฑเนเธเธ•เนเธณ ${money(product.nextBidCents)}`}
              />
              <Button type="button" className="h-11" onClick={submitBid}>เธเธดเธ”</Button>
              <Button type="button" variant="outline" className={cn(favorite && "border-primary text-primary")} onClick={toggleFavorite}>
                <Heart className={cn("size-4", favorite && "fill-current")} data-icon="inline-start" />
                {favorite ? "เธ•เธดเธ”เธ•เธฒเธกเธญเธขเธนเน" : "เน€เธเธดเนเธกเธฃเธฒเธขเธเธฒเธฃเนเธเธฃเธ”"}
              </Button>
              <p className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{notice}</p>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <TrustRow icon={<Bell className="size-4" />} text="เนเธเนเธเน€เธ•เธทเธญเธเน€เธกเธทเนเธญเธกเธตเธเธเธเธดเธ”เธ—เธฑเธเนเธฅเธฐเธเนเธงเธ 5 เธเธฒเธ—เธตเธชเธธเธ”เธ—เนเธฒเธข" />
              <TrustRow icon={<ShieldCheck className="size-4" />} text="เธเธนเนเธเธเธฐเธ•เนเธญเธเธเธณเธฃเธฐเน€เธเธดเธเธ เธฒเธขเนเธ 24 เธเธฑเนเธงเนเธกเธ" />
              <TrustRow icon={<CheckCircle2 className="size-4" />} text="เธฃเนเธฒเธเธเนเธฒเธ•เนเธญเธเธเธฑเธ”เธชเนเธเธ เธฒเธขเนเธ SLA เธซเธฅเธฑเธเธเธณเธฃเธฐเน€เธเธดเธ" />
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">เธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธเธฃเธฐเธกเธนเธฅ</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3">เธเธนเนเธฃเนเธงเธกเธเธฃเธฐเธกเธนเธฅ</th>
                    <th className="p-3">เธฃเธฒเธเธฒเธ—เธตเนเธเธฃเธฐเธกเธนเธฅ</th>
                    <th className="p-3">เธงเธฑเธ/เน€เธงเธฅเธฒ</th>
                  </tr>
                </thead>
                <tbody>
                  {product.bids.length === 0 ? (
                    <tr><td className="p-6 text-center text-slate-500" colSpan={3}>เธขเธฑเธเนเธกเนเธกเธตเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธเธฃเธฐเธกเธนเธฅ</td></tr>
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
              <h2 className="text-2xl font-black">เธชเธฃเธธเธเธเธฒเธฃเธเธฒเธข</h2>
              <span className="text-sm font-semibold text-primary">เธฃเธฒเธเธฒเน€เธเธดเธ” {money(product.openingPriceCents)}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric label="เธเธนเนเธ•เธดเธ”เธ•เธฒเธก" value={`${product.watcherCount.toLocaleString("th-TH")} เธเธ`} />
              <Metric label="เธฃเธตเธงเธดเธงเธฃเนเธฒเธ" value={`${product.sellerShop.rating.toFixed(1)} (${product.sellerShop.reviewCount})`} />
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
      ["เธงเธฑเธ", remaining?.days ?? 0],
      ["เธเธฑเนเธงเนเธกเธ", remaining?.hours ?? 0],
      ["เธเธฒเธ—เธต", remaining?.minutes ?? 0],
      ["เธงเธดเธเธฒเธ—เธต", remaining?.seconds ?? 0],
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


