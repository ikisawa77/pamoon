"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  Gem,
  Heart,
  type LucideIcon,
  Search,
  SlidersHorizontal,
  Store,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";
import type { AuctionProduct, ListingMode, MarketplaceSnapshot, ProductCategory, ProductRarity } from "@/types/marketplace";

type CatalogMode = ListingMode | "all";
type SortMode = "ending" | "latest" | "priceHigh" | "priceLow" | "popular";

interface ProductCatalogClientProps {
  initialData: MarketplaceSnapshot;
  mode: CatalogMode;
  title: string;
  subtitle: string;
  eyebrow: string;
}

interface FavoriteResponse {
  ok: boolean;
  error?: {
    message: string;
  };
}

interface ActionResponse {
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

const categoryLabels: Record<ProductCategory | "all", string> = {
  all: "ทุกเซ็ต",
  op01: "OP-01",
  op02: "OP-02",
  op03: "OP-03",
  op04: "OP-04",
  op05: "OP-05",
};

const rarityOptions: Array<ProductRarity | "all"> = ["all", "C", "UC", "R", "L", "SR", "SEC", "SP", "P"];

const money = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("THB", "฿");

const getRemaining = (auctionEndsAt: string | null, now: number) => {
  if (!auctionEndsAt) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor((new Date(auctionEndsAt).getTime() - now) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
};

const sortProducts = (products: AuctionProduct[], sortMode: SortMode) =>
  [...products].sort((left, right) => {
    if (sortMode === "priceHigh") return right.currentPrice - left.currentPrice;
    if (sortMode === "priceLow") return left.currentPrice - right.currentPrice;
    if (sortMode === "popular") return right.watchers - left.watchers;
    if (sortMode === "latest") return right.id.localeCompare(left.id);

    const leftEnds = left.auctionEndsAt ? new Date(left.auctionEndsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightEnds = right.auctionEndsAt ? new Date(right.auctionEndsAt).getTime() : Number.MAX_SAFE_INTEGER;
    return leftEnds - rightEnds;
  });

const ProductCatalogClient = ({ initialData, mode, title, subtitle, eyebrow }: ProductCatalogClientProps) => {
  const [products, setProducts] = useState(initialData.products);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<ProductRarity | "all">("all");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>(mode === "buy" ? "latest" : "ending");
  const [dockOpen, setDockOpen] = useState(false);
  const [notice, setNotice] = useState("กดหัวใจเพื่อเพิ่มรายการโปรดและเปิดแจ้งเตือนอีเมลสำหรับประมูลที่ติดตาม");
  const [now, setNow] = useState(() => Date.now());
  const viewer = initialData.viewer;
  const isGuest = viewer.role === "GUEST";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const scopedProducts = products.filter((product) => mode === "all" || product.mode === mode);

    return sortProducts(
      scopedProducts.filter((product) => {
        const queryMatched =
          !normalizedQuery ||
          `${product.title} ${product.code} ${product.seller} ${product.rarity}`.toLowerCase().includes(normalizedQuery);
        const rarityMatched = rarity === "all" || product.rarity === rarity;
        const categoryMatched = category === "all" || product.category === category;

        return queryMatched && rarityMatched && categoryMatched;
      }),
      sortMode,
    );
  }, [category, mode, products, query, rarity, sortMode]);

  const auctionCount = products.filter((product) => product.mode === "auction").length;
  const buyCount = products.filter((product) => product.mode === "buy").length;
  const favoriteCount = products.filter((product) => product.isFavorite).length;
  const resultLabel = mode === "auction" ? "สินค้าประมูล" : mode === "buy" ? "สินค้าซื้อเลย" : "สินค้า";

  const toggleFavorite = async (product: AuctionProduct) => {
    if (isGuest) {
      setNotice("กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด");
      return;
    }

    const nextFavorite = !product.isFavorite;
    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, isFavorite: nextFavorite } : item)));

    const response = await fetch(nextFavorite ? "/api/favorites" : `/api/favorites?productId=${product.id}`, {
      method: nextFavorite ? "POST" : "DELETE",
      headers: nextFavorite ? { "Content-Type": "application/json" } : undefined,
      body: nextFavorite
        ? JSON.stringify({
            productId: product.id,
            emailNotify: true,
            notifyOutbid: true,
            notifyEndingSoon: product.mode === "auction",
          })
        : undefined,
    });
    const result = (await response.json()) as FavoriteResponse;

    if (!response.ok || !result.ok) {
      setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, isFavorite: !nextFavorite } : item)));
      setNotice(result.error?.message ?? "บันทึกรายการโปรดไม่สำเร็จ");
      return;
    }

    setNotice(nextFavorite ? `เพิ่ม ${product.title} ในรายการโปรดแล้ว` : `ลบ ${product.title} ออกจากรายการโปรดแล้ว`);
  };

  const handleProductAction = async (product: AuctionProduct) => {
    if (isGuest) {
      setNotice("กรุณาเข้าสู่ระบบก่อนซื้อหรือเสนอราคา");
      return;
    }

    const response = await fetch(product.mode === "auction" ? "/api/bids" : "/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        product.mode === "auction"
          ? { productId: product.id, amountCents: product.nextBid * 100 }
          : { productId: product.id },
      ),
    });
    const result = (await response.json()) as ActionResponse;

    if (!response.ok || !result.ok) {
      setNotice(result.error?.message ?? "ทำรายการไม่สำเร็จ");
      return;
    }

    const updatedProduct = result.product;

    if (product.mode === "auction" && updatedProduct) {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                currentPrice: Math.round(updatedProduct.currentPriceCents / 100),
                nextBid: Math.round(updatedProduct.nextBidCents / 100),
                auctionEndsAt: updatedProduct.auctionEndsAt,
                topBidder: viewer.displayName,
              }
            : item,
        ),
      );
      setNotice(`เสนอราคา ${product.title} สำเร็จ`);
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setNotice(`ซื้อ ${product.title} สำเร็จ`);
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
            <Button asChild variant={mode === "auction" ? "secondary" : "ghost"}><Link href="/auctions">ประมูล</Link></Button>
            <Button asChild variant={mode === "buy" ? "secondary" : "ghost"}><Link href="/buy-now">ซื้อเลย</Link></Button>
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

      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:pl-24">
        <section className="grid gap-8 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <Badge className="mb-4">{eyebrow}</Badge>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">{subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={() => setDockOpen(true)}>
                <SlidersHorizontal data-icon="inline-start" />
                เปิดตัวกรอง
              </Button>
              <Button asChild variant="outline">
                <Link href="/collection">
                  <Heart data-icon="inline-start" />
                  รายการโปรด {favoriteCount}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric icon={Trophy} label="ประมูล" value={auctionCount.toLocaleString("th-TH")} />
            <Metric icon={CreditCard} label="ซื้อเลย" value={buyCount.toLocaleString("th-TH")} />
            <Metric icon={Heart} label="ติดตาม" value={favoriteCount.toLocaleString("th-TH")} />
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-background p-4 md:flex-row md:items-center">
            <div className="min-w-0">
              <strong className="block">{resultLabel}: {visibleProducts.length.toLocaleString("th-TH")} รายการ</strong>
              <span className="text-sm text-muted-foreground">{notice}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ending", "latest", "popular", "priceHigh", "priceLow"] as SortMode[]).map((sort) => (
                <Button key={sort} type="button" size="sm" variant={sortMode === sort ? "default" : "outline"} onClick={() => setSortMode(sort)}>
                  {sort === "ending" ? "ใกล้หมดเวลา" : sort === "latest" ? "ล่าสุด" : sort === "popular" ? "นิยม" : sort === "priceHigh" ? "ราคาสูง" : "ราคาต่ำ"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {visibleProducts.map((product) => (
              <AuctionCard key={product.id} product={product} now={now} onAction={handleProductAction} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        </section>
      </main>

      <FilterDock
        open={dockOpen}
        query={query}
        rarity={rarity}
        category={category}
        onOpenChange={setDockOpen}
        onQueryChange={setQuery}
        onRarityChange={setRarity}
        onCategoryChange={setCategory}
      />
    </div>
  );
};

interface AuctionCardProps {
  product: AuctionProduct;
  now: number;
  onAction: (product: AuctionProduct) => void;
  onToggleFavorite: (product: AuctionProduct) => void;
}

const AuctionCard = ({ product, now, onAction, onToggleFavorite }: AuctionCardProps) => {
  const remaining = getRemaining(product.auctionEndsAt, now);

  return (
    <article className="group overflow-hidden rounded-xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={product.mode === "auction" ? `/auctions/${product.id}` : "/buy-now"} className="block">
        <div className={cn("product-art relative aspect-[100/140] overflow-hidden bg-muted", product.imagePositionClass)}>
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1536px) 12vw, (min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-300 group-hover:scale-105" />
          ) : null}
        </div>
      </Link>
      <div className="grid gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={product.mode === "auction" ? "default" : "secondary"}>{product.mode === "auction" ? "ประมูล" : "ซื้อเลย"}</Badge>
          <button
            type="button"
            className={cn("flex h-8 items-center gap-1 rounded-full border px-2 text-xs text-primary", product.isFavorite && "bg-primary text-primary-foreground")}
            onClick={() => onToggleFavorite(product)}
            aria-label="เพิ่มรายการโปรด"
          >
            <Heart className={cn("size-4", product.isFavorite && "fill-current")} />
            {product.watchers}
          </button>
        </div>
        <Link href={product.mode === "auction" ? `/auctions/${product.id}` : "/buy-now"} className="grid gap-1">
          <h2 className="line-clamp-2 min-h-10 font-semibold underline-offset-2 group-hover:underline">{product.title}</h2>
          <p className="line-clamp-2 min-h-10 text-xs text-muted-foreground">{product.code}</p>
        </Link>
        <div>
          <span className="text-xs text-muted-foreground">{product.mode === "auction" ? "ราคาปัจจุบัน" : "ราคา"}</span>
          <strong className="block text-lg text-primary">{money(product.currentPrice)}</strong>
        </div>
        {product.mode === "auction" ? <CountdownPill remaining={remaining} /> : null}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <Store className="size-4" />
            {product.seller}
          </span>
          {product.isFavorite ? <span className="inline-flex items-center gap-1 text-primary"><Bell className="size-4" />อีเมล</span> : null}
        </div>
        <Button type="button" size="sm" onClick={() => onAction(product)}>
          {product.mode === "auction" ? `บิด ${money(product.nextBid)}` : "ซื้อเลย"}
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </article>
  );
};

const CountdownPill = ({ remaining }: { remaining: ReturnType<typeof getRemaining> }) => (
  <div className="grid grid-cols-4 rounded-full bg-[#191919] px-3 py-2 text-center text-white">
    {[
      ["วัน", remaining?.days ?? 0],
      ["ชั่วโมง", remaining?.hours ?? 0],
      ["นาที", remaining?.minutes ?? 0],
      ["วินาที", remaining?.seconds ?? 0],
    ].map(([label, value]) => (
      <span key={label} className="border-r border-white/15 last:border-r-0">
        <strong className="block text-sm leading-none">{String(value).padStart(2, "0")}</strong>
        <span className="text-[10px] text-white/65">{label}</span>
      </span>
    ))}
  </div>
);

interface MetricProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

const Metric = ({ icon: Icon, label, value }: MetricProps) => (
  <div className="rounded-2xl border bg-background p-4">
    <Icon className="mb-3 text-primary" />
    <strong className="block text-2xl">{value}</strong>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

interface FilterDockProps {
  open: boolean;
  query: string;
  rarity: ProductRarity | "all";
  category: ProductCategory | "all";
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onRarityChange: (rarity: ProductRarity | "all") => void;
  onCategoryChange: (category: ProductCategory | "all") => void;
}

const FilterDock = ({ open, query, rarity, category, onOpenChange, onQueryChange, onRarityChange, onCategoryChange }: FilterDockProps) => (
  <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 lg:left-5 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2">
    <div className={cn("flex items-end gap-2 rounded-3xl border bg-background/90 p-2 shadow-2xl backdrop-blur transition-all lg:flex-col", open && "items-stretch p-3")}>
      <Button type="button" size="icon" className="rounded-2xl" onClick={() => onOpenChange(!open)} aria-label="เปิดตัวกรอง">
        {open ? <X /> : <Filter />}
      </Button>
      {open ? (
        <div className="grid w-[min(82vw,360px)] gap-3 lg:w-72">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-9" placeholder="ค้นหาชื่อการ์ด ร้าน หรือรหัส" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {rarityOptions.map((item) => (
              <Button key={item} type="button" size="sm" variant={rarity === item ? "default" : "outline"} onClick={() => onRarityChange(item)}>
                {item === "all" ? "ทั้งหมด" : item}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(categoryLabels) as Array<ProductCategory | "all">).map((item) => (
              <Button key={item} type="button" size="sm" variant={category === item ? "default" : "outline"} onClick={() => onCategoryChange(item)}>
                {categoryLabels[item]}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex size-12 items-center justify-center rounded-2xl border bg-background text-primary">
            <Gem className="size-5" />
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border bg-background text-primary">
            <Clock3 className="size-5" />
          </div>
        </>
      )}
    </div>
  </div>
);

export { ProductCatalogClient };
