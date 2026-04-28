"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  Flame,
  Gem,
  Home,
  type LucideIcon,
  Newspaper,
  Search,
  ShieldCheck,
  ShoppingBag,
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

interface HomeContentItem {
  id: string;
  type: "SLIDE" | "PROMOTION" | "ARTICLE" | "FEATURED_SHOP";
  title: string;
  subtitle: string | null;
  body: string | null;
  href: string | null;
  imageUrl: string | null;
  badge: string | null;
  sortOrder: number;
}

interface HomeProductItem {
  id: string;
  title: string;
  cardCode: string;
  setName: string;
  rarity: string;
  mode: "AUCTION" | "BUY";
  currentPriceCents: number;
  imageUrl: string | null;
  auctionEndsAt: string | null;
  watcherCount: number;
  sellerShop: {
    name: string;
    slug: string;
  };
}

interface HomeShopItem {
  id: string;
  name: string;
  slug: string;
  rating: number;
  reviewCount: number;
  _count: {
    products: number;
  };
}

interface HomepageExperienceProps {
  contents: HomeContentItem[];
  endingAuctions: HomeProductItem[];
  latestAuctions: HomeProductItem[];
  latestSales: HomeProductItem[];
  recommendedShops: HomeShopItem[];
  viewerName: string;
}

type DockFilter = "all" | "auction" | "buy" | "rare" | "shops";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const contentByType = (contents: HomeContentItem[], type: HomeContentItem["type"]) =>
  contents.filter((content) => content.type === type).sort((left, right) => left.sortOrder - right.sortOrder);

const formatEndsAt = (value: string | null) => {
  if (!value) {
    return "รอกำหนดเวลา";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const HomepageExperience = ({
  contents,
  endingAuctions,
  latestAuctions,
  latestSales,
  recommendedShops,
  viewerName,
}: HomepageExperienceProps) => {
  const slides = contentByType(contents, "SLIDE");
  const promotions = contentByType(contents, "PROMOTION");
  const articles = contentByType(contents, "ARTICLE");
  const featuredShopContents = contentByType(contents, "FEATURED_SHOP");
  const [activeSlide, setActiveSlide] = useState(0);
  const [dockOpen, setDockOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DockFilter>("all");
  const [query, setQuery] = useState("");

  const heroSlide = slides[activeSlide] ?? slides[0];
  const filteredDockProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const combinedProducts = [...latestSales, ...latestAuctions];

    return combinedProducts.filter((product) => {
      const queryMatched =
        !normalizedQuery ||
        `${product.title} ${product.cardCode} ${product.setName} ${product.sellerShop.name}`.toLowerCase().includes(normalizedQuery);
      const filterMatched =
        activeFilter === "all" ||
        (activeFilter === "buy" && product.mode === "BUY") ||
        (activeFilter === "auction" && product.mode === "AUCTION") ||
        (activeFilter === "rare" && ["SR", "SEC", "SP", "P"].includes(product.rarity)) ||
        activeFilter === "shops";

      return queryMatched && filterMatched;
    });
  }, [activeFilter, latestAuctions, latestSales, query]);

  const dockRailTitle =
    activeFilter === "auction"
      ? "ประมูลจากตัวกรอง"
      : activeFilter === "rare"
        ? "การ์ดหายากจากตัวกรอง"
        : activeFilter === "shops"
          ? "สินค้าตามร้านค้าที่ค้นหา"
          : "ลงขายล่าสุด";

  const dockItems: Array<{ value: DockFilter; label: string; icon: LucideIcon }> = [
    { value: "all", label: "ทั้งหมด", icon: Home },
    { value: "auction", label: "ประมูล", icon: Trophy },
    { value: "buy", label: "ซื้อเลย", icon: CreditCard },
    { value: "rare", label: "หายาก", icon: Gem },
    { value: "shops", label: "ร้านค้า", icon: Store },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              ★
            </div>
            <div className="text-2xl font-bold tracking-tight">
              <span>BidCard</span> <span className="text-primary">TH</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost"><Link href="/auctions">ประมูล</Link></Button>
            <Button asChild variant="ghost"><Link href="/buy-now">ซื้อเลย</Link></Button>
            <Button asChild variant="ghost"><Link href="/shops">ร้านค้า</Link></Button>
            <Button asChild variant="ghost"><Link href="/collection">รายการโปรด</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/account">{viewerName}</Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(215,38,49,0.18),transparent_32%),linear-gradient(135deg,#12151c,#2b303a_52%,#f1eee7_52%)]" />
          <div className="relative mx-auto grid min-h-[calc(100svh-68px)] max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
            <div className="max-w-2xl text-white">
              <Badge className="mb-5 bg-white text-foreground">{heroSlide?.badge ?? "Marketplace"}</Badge>
              <h1 className="text-5xl font-black leading-none tracking-normal sm:text-7xl">
                {heroSlide?.title ?? "BidCard TH"}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/82">
                {heroSlide?.subtitle ?? "ตลาดประมูลและซื้อขายการ์ดที่เชื่อมสมาชิก ร้านค้า และหลังบ้านเข้าด้วยกัน"}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground">
                  <Link href={heroSlide?.href ?? "/auctions"}>
                    เริ่มดูประมูล <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/seller/register">เปิดร้านค้า</Link>
                </Button>
              </div>
              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/20 pt-5 text-sm text-white/80">
                <span><strong className="block text-2xl text-white">{endingAuctions.length}</strong>ใกล้หมดเวลา</span>
                <span><strong className="block text-2xl text-white">{latestSales.length}</strong>ลงขายล่าสุด</span>
                <span><strong className="block text-2xl text-white">{recommendedShops.length}</strong>ร้านแนะนำ</span>
              </div>
            </div>

            <div className="relative">
              <div className="product-art object-pos-2 relative aspect-[3/4] overflow-hidden rounded-[28px] border border-white/20 bg-muted shadow-2xl">
                {heroSlide?.imageUrl ? <Image src={heroSlide.imageUrl} alt={heroSlide.title} fill sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" priority /> : null}
              </div>
              <div className="absolute -bottom-5 left-4 right-4 rounded-2xl bg-background/95 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">ประมูลเด่น</span>
                    <strong className="block truncate">{endingAuctions[0]?.title ?? "Rare Card Auction"}</strong>
                  </div>
                  <strong className="text-primary">{moneyFromCents(endingAuctions[0]?.currentPriceCents ?? 0)}</strong>
                </div>
              </div>
            </div>

            {slides.length > 1 ? (
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={cn("h-2.5 rounded-full bg-white/50 transition-all", index === activeSlide ? "w-10 bg-white" : "w-2.5")}
                    aria-label={`เปิดสไลด์ ${index + 1}`}
                    onClick={() => setActiveSlide(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-12">
            <PromoStrip promotions={promotions} />
            <ProductRail title="ประมูลใกล้จะหมดเวลา" icon={Clock3} products={endingAuctions} href="/auctions" />
            <ProductRail title={dockRailTitle} icon={ShoppingBag} products={filteredDockProducts} href={activeFilter === "auction" ? "/auctions" : "/buy-now"} />
            <ProductRail title="ประมูลล่าสุด" icon={Flame} products={latestAuctions} href="/auctions" />
            <ArticleSection articles={articles} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <section className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">ร้านค้าแนะนำ</h2>
                  <p className="text-sm text-muted-foreground">แก้ไขรายการเด่นได้ในหลังบ้าน</p>
                </div>
                <ShieldCheck className="text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {recommendedShops.map((shop) => (
                  <Link key={shop.id} href={`/shops/${shop.slug}`} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 transition hover:bg-muted">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      {shop.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate">{shop.name}</strong>
                      <span className="text-xs text-muted-foreground">
                        {shop.rating.toFixed(1)} คะแนน · {shop._count.products} รายการ
                      </span>
                    </div>
                  </Link>
                ))}
                {featuredShopContents.map((shop) => (
                  <Link key={shop.id} href={shop.href ?? "/shops"} className="block rounded-xl border bg-background p-3 transition hover:bg-muted">
                    <Badge variant="outline">{shop.badge ?? "แนะนำ"}</Badge>
                    <strong className="mt-2 block">{shop.title}</strong>
                    <span className="text-sm text-muted-foreground">{shop.subtitle}</span>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </main>

      <MacFilterDock
        open={dockOpen}
        activeFilter={activeFilter}
        query={query}
        dockItems={dockItems}
        onOpenChange={setDockOpen}
        onFilterChange={setActiveFilter}
        onQueryChange={setQuery}
      />

      <footer className="border-t bg-[#151922] px-4 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto_auto]">
          <div>
            <strong className="text-2xl">BidCard TH</strong>
            <p className="mt-2 max-w-md text-sm text-white/65">
              ระบบประมูลและซื้อขายการ์ดพร้อม wallet, escrow, SLA, แจ้งเตือน realtime และหลังบ้านสำหรับจัดการหน้าแรก
            </p>
          </div>
          <div className="grid gap-2 text-sm text-white/75">
            <Link href="/auctions">ประมูล</Link>
            <Link href="/buy-now">ซื้อเลย</Link>
            <Link href="/shops">ร้านค้า</Link>
          </div>
          <div className="grid gap-2 text-sm text-white/75">
            <Link href="/help">ช่วยเหลือ</Link>
            <Link href="/account">บัญชีของฉัน</Link>
            <Link href="/admin">หลังบ้าน</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ProductRailProps {
  title: string;
  icon: LucideIcon;
  products: HomeProductItem[];
  href: string;
}

const ProductRail = ({ title, icon: Icon, products, href }: ProductRailProps) => (
  <section>
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="text-primary" />
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>ดูทั้งหมด</Link>
      </Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {products.slice(0, 8).map((product, index) => (
        <Link key={product.id} href={product.mode === "AUCTION" ? "/auctions" : "/buy-now"} className="group overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div className={cn("product-art relative aspect-[4/3] overflow-hidden bg-muted", `object-pos-${(index % 3) + 1}`)}>
            {product.imageUrl ? <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /> : null}
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Badge variant={product.mode === "AUCTION" ? "default" : "secondary"}>{product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}</Badge>
              <Badge variant="outline">{product.rarity}</Badge>
            </div>
            <strong className="line-clamp-1">{product.title}</strong>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{product.sellerShop.name}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <span className="text-lg font-bold text-primary">{moneyFromCents(product.currentPriceCents)}</span>
              <span className="text-xs text-muted-foreground">{product.mode === "AUCTION" ? formatEndsAt(product.auctionEndsAt) : `${product.watcherCount} views`}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

const PromoStrip = ({ promotions }: { promotions: HomeContentItem[] }) => (
  <section className="grid gap-4 md:grid-cols-2">
    {promotions.slice(0, 2).map((promotion) => (
      <Link key={promotion.id} href={promotion.href ?? "/"} className="group grid min-h-48 overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:grid-cols-[1fr_170px]">
        <div className="p-5">
          <Badge>{promotion.badge ?? "โปรโมชัน"}</Badge>
          <h2 className="mt-4 text-2xl font-bold">{promotion.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{promotion.subtitle}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            เปิดดู <ChevronRight data-icon="inline-end" />
          </span>
        </div>
        <div className="product-art object-pos-3 relative min-h-36 overflow-hidden bg-muted">
          {promotion.imageUrl ? <Image src={promotion.imageUrl} alt={promotion.title} fill sizes="170px" className="object-cover" /> : null}
        </div>
      </Link>
    ))}
  </section>
);

const ArticleSection = ({ articles }: { articles: HomeContentItem[] }) => (
  <section>
    <div className="mb-4 flex items-center gap-2">
      <Newspaper className="text-primary" />
      <h2 className="text-2xl font-bold">บทความที่น่าสนใจ</h2>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {articles.slice(0, 4).map((article) => (
        <Link key={article.id} href={article.href ?? "/help"} className="overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          {article.imageUrl ? (
            <div className="relative aspect-[16/7] bg-muted">
              <Image src={article.imageUrl} alt={article.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          <div className="p-5">
            <Badge variant="outline">{article.badge ?? "Article"}</Badge>
            <h3 className="mt-4 text-xl font-bold">{article.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{article.body ?? article.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

interface MacFilterDockProps {
  open: boolean;
  activeFilter: DockFilter;
  query: string;
  dockItems: Array<{ value: DockFilter; label: string; icon: LucideIcon }>;
  onOpenChange: (open: boolean) => void;
  onFilterChange: (filter: DockFilter) => void;
  onQueryChange: (query: string) => void;
}

const MacFilterDock = ({ open, activeFilter, query, dockItems, onOpenChange, onFilterChange, onQueryChange }: MacFilterDockProps) => (
  <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 lg:left-5 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2">
    <div className={cn("flex items-end gap-2 rounded-3xl border bg-background/90 p-2 shadow-2xl backdrop-blur transition-all lg:flex-col", open && "items-stretch p-3")}>
      <Button type="button" size="icon" className="rounded-2xl" onClick={() => onOpenChange(!open)} aria-label="เปิดตัวกรอง">
        {open ? <X /> : <SlidersHorizontal />}
      </Button>
      {dockItems.map((item) => (
        <button
          key={item.value}
          type="button"
          className={cn(
            "group flex items-center justify-center gap-2 rounded-2xl border bg-background px-3 py-3 text-sm shadow-sm transition-all hover:-translate-y-2 hover:scale-110 lg:hover:translate-x-2 lg:hover:translate-y-0",
            activeFilter === item.value && "bg-primary text-primary-foreground",
            open ? "w-44 justify-start" : "size-12 px-0",
          )}
          onClick={() => onFilterChange(item.value)}
        >
          <item.icon className="size-5" />
          {open ? <span>{item.label}</span> : null}
        </button>
      ))}
      {open ? (
        <div className="relative w-56 lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-9" placeholder="ค้นหาการ์ด/ร้านค้า" />
        </div>
      ) : (
        <div className="flex size-12 items-center justify-center rounded-2xl border bg-background text-muted-foreground">
          <Filter className="size-5" />
        </div>
      )}
    </div>
  </div>
);

export { HomepageExperience };
