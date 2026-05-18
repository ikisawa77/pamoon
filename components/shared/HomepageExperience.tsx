"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { AppFooter } from "@/components/shared/AppFooter";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { richTextToPlainText } from "@/lib/richtext";
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

interface HomeProduct {
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

interface RecommendedShop {
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
  endingAuctions: HomeProduct[];
  latestAuctions: HomeProduct[];
  latestSales: HomeProduct[];
  recommendedShops: RecommendedShop[];
  viewerName: string;
  viewerRole: string;
  isAuthenticated: boolean;
}

type DockFilter = "all" | "auction" | "buy" | "rare" | "shops";

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value / 100);

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

const dockItems: Array<{ value: DockFilter; label: string; icon: LucideIcon }> = [
  { value: "all", label: "ทั้งหมด", icon: Home },
  { value: "auction", label: "ประมูล", icon: Trophy },
  { value: "buy", label: "ซื้อเลย", icon: CreditCard },
  { value: "rare", label: "หายาก", icon: Gem },
  { value: "shops", label: "ร้านค้า", icon: Store },
];

const HomepageExperience = ({
  contents,
  endingAuctions,
  latestAuctions,
  latestSales,
  recommendedShops,
  viewerName,
  viewerRole,
  isAuthenticated,
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

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <SimpleAppHeader user={isAuthenticated ? { displayName: viewerName, role: viewerRole } : null} />

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(0,217,255,0.28),transparent_30%),radial-gradient(circle_at_8%_70%,rgba(225,29,72,0.24),transparent_28%)]" />
          <div className="relative mx-auto grid min-h-[calc(100svh-68px)] max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center">
            <div className="max-w-2xl">
              <Badge className="mb-5 bg-white text-slate-950">{heroSlide?.badge ?? "Retro Marketplace"}</Badge>
              <h1 className="text-5xl font-black leading-none tracking-normal sm:text-7xl">
                {heroSlide?.title ?? "BidCard TH"}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                {heroSlide?.subtitle ?? "ตลาดประมูลและซื้อขายการ์ดที่เชื่อมสมาชิก Reseller กระเป๋าเงิน แจ้งเตือน และระบบหลังบ้านไว้ในประสบการณ์เดียว"}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="shadow-lg shadow-primary/25">
                  <Link href={heroSlide?.href ?? "/auctions"}>
                    เริ่มประมูล <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/buy-now">ซื้อเลย</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">สมัคร Reseller</Link>
                </Button>
              </div>
              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-5 text-sm text-muted-foreground">
                <span><strong className="block text-2xl text-foreground">{endingAuctions.length}</strong>ใกล้หมดเวลา</span>
                <span><strong className="block text-2xl text-foreground">{latestSales.length}</strong>ลงขายล่าสุด</span>
                <span><strong className="block text-2xl text-foreground">{recommendedShops.length}</strong>ร้านแนะนำ</span>
              </div>
            </div>

            <div className="relative">
              <div className="holo-card neon-border relative aspect-[3/4] overflow-hidden rounded-[30px] border border-white/10 shadow-2xl">
                {heroSlide?.imageUrl ? (
                  <Image src={heroSlide.imageUrl} alt={heroSlide.title} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover mix-blend-screen opacity-90" priority />
                ) : (
                  <div className="product-art object-pos-2 h-full w-full opacity-80" />
                )}
              </div>
              <div className="neon-panel absolute -bottom-5 left-4 right-4 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">ประมูลเด่น</span>
                    <strong className="block truncate">{endingAuctions[0]?.title ?? "Rare Card Auction"}</strong>
                  </div>
                  <strong className="text-bid">{moneyFromCents(endingAuctions[0]?.currentPriceCents ?? 0)}</strong>
                </div>
              </div>
            </div>

            {slides.length > 1 ? (
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={cn("h-2.5 rounded-full bg-white/30 transition-all", index === activeSlide ? "w-10 bg-white" : "w-2.5")}
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
            <ProductRail title="ประมูลใกล้หมดเวลา" icon={Clock3} products={endingAuctions} href="/auctions" />
            <ProductRail title={dockRailTitle} icon={ShoppingBag} products={filteredDockProducts} href={activeFilter === "auction" ? "/auctions" : "/buy-now"} />
            <ProductRail title="ประมูลล่าสุด" icon={Flame} products={latestAuctions} href="/auctions" />
            <ArticleSection articles={articles} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <section className="neon-panel rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">ร้านค้าแนะนำ</h2>
                  <p className="text-sm text-muted-foreground">จัดการรายการเด่นได้จากหลังบ้าน</p>
                </div>
                <ShieldCheck className="text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                {recommendedShops.map((shop) => (
                  <Link key={shop.id} href={`/shops/${shop.slug}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      {shop.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate">{shop.name}</strong>
                      <span className="text-xs text-muted-foreground">
                        {shop.rating.toFixed(1)} คะแนน / {shop._count.products} รายการ
                      </span>
                    </div>
                  </Link>
                ))}
                {featuredShopContents.map((shop) => (
                  <Link key={shop.id} href={shop.href ?? "/shops"} className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]">
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

      <AppFooter />
      <MacFilterDock
        open={dockOpen}
        activeFilter={activeFilter}
        query={query}
        onOpenChange={setDockOpen}
        onFilterChange={setActiveFilter}
        onQueryChange={setQuery}
      />
    </div>
  );
};

interface ProductRailProps {
  title: string;
  icon: LucideIcon;
  products: HomeProduct[];
  href: string;
}

const ProductRail = ({ title, icon: Icon, products, href }: ProductRailProps) => (
  <section>
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={href}>ดูทั้งหมด</Link>
      </Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {products.slice(0, 8).map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  </section>
);

const ProductCard = ({ product, index }: { product: HomeProduct; index: number }) => {
  const href = product.mode === "AUCTION" ? `/auctions/${product.id}` : `/buy-now/${product.id}`;

  return (
    <Link href={href} className="neon-panel group overflow-hidden rounded-2xl transition hover:-translate-y-1">
      <div className={cn("product-art relative aspect-[4/5] overflow-hidden bg-white/5", `object-pos-${(index % 3) + 1}`)}>
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1280px) 18vw, 50vw" className="object-cover transition group-hover:scale-105" />
        ) : null}
        <Badge className="absolute left-3 top-3">{product.mode === "AUCTION" ? "ประมูล" : "ซื้อเลย"}</Badge>
        <Badge variant="secondary" className="absolute right-3 top-3">{product.rarity}</Badge>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold">{product.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{product.cardCode} • {product.setName}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <span className="block text-xs text-muted-foreground">{product.mode === "AUCTION" ? "ราคาปัจจุบัน" : "ราคา"}</span>
            <strong className="text-lg text-bid">{moneyFromCents(product.currentPriceCents)}</strong>
          </div>
          <span className="text-right text-xs text-muted-foreground">
            {product.mode === "AUCTION" ? formatEndsAt(product.auctionEndsAt) : product.sellerShop.name}
          </span>
        </div>
      </div>
    </Link>
  );
};

const PromoStrip = ({ promotions }: { promotions: HomeContentItem[] }) => {
  const items = promotions.length > 0 ? promotions.slice(0, 3) : [
    { id: "wallet", title: "เติมเงินพร้อมบิด", subtitle: "รองรับ wallet และ escrow สำหรับคำสั่งซื้อ", href: "/account", badge: "Wallet" },
    { id: "reseller", title: "เปิดร้าน Reseller", subtitle: "ลงขายและลงประมูลได้จากบัญชีเดียว", href: "/register", badge: "Reseller" },
    { id: "notify", title: "แจ้งเตือนเรียลไทม์", subtitle: "กระดิ่งและอีเมลสำหรับ bid, order และ SLA", href: "/notifications", badge: "Realtime" },
  ] satisfies Array<Pick<HomeContentItem, "id" | "title" | "subtitle" | "href" | "badge">>;

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {items.map((promotion) => (
        <Link key={promotion.id} href={promotion.href ?? "/"} className="neon-panel rounded-2xl p-5 transition hover:-translate-y-1">
          <Badge variant="outline">{promotion.badge ?? "Promotion"}</Badge>
          <h2 className="mt-3 text-xl font-bold">{promotion.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{promotion.subtitle}</p>
        </Link>
      ))}
    </section>
  );
};

const ArticleSection = ({ articles }: { articles: HomeContentItem[] }) => (
  <section>
    <div className="mb-4 flex items-center gap-2">
      <Newspaper className="size-5 text-primary" />
      <h2 className="text-2xl font-black">บทความที่น่าสนใจ</h2>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {(articles.length > 0 ? articles.slice(0, 3) : []).map((article) => (
        <Link key={article.id} href={article.href ?? "#"} className="neon-panel rounded-2xl p-5 transition hover:-translate-y-1">
          <Badge variant="outline">{article.badge ?? "Guide"}</Badge>
          <h3 className="mt-3 line-clamp-2 text-lg font-bold">{article.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {article.subtitle ?? richTextToPlainText(article.body ?? "").slice(0, 140)}
          </p>
        </Link>
      ))}
      {articles.length === 0 ? (
        <div className="neon-panel rounded-2xl p-5 md:col-span-3">
          <p className="text-sm text-muted-foreground">ยังไม่มีบทความเด่น ผู้ดูแลสามารถเพิ่มบทความจากหลังบ้านได้</p>
        </div>
      ) : null}
    </div>
  </section>
);

interface MacFilterDockProps {
  open: boolean;
  activeFilter: DockFilter;
  query: string;
  onOpenChange: (open: boolean) => void;
  onFilterChange: (filter: DockFilter) => void;
  onQueryChange: (query: string) => void;
}

const MacFilterDock = ({ open, activeFilter, query, onOpenChange, onFilterChange, onQueryChange }: MacFilterDockProps) => (
  <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 lg:left-5 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2">
    <div className={cn("neon-panel flex items-end gap-2 rounded-3xl p-2 transition-all lg:flex-col", open && "items-stretch p-3")}>
      <Button type="button" size="icon" className="rounded-2xl" onClick={() => onOpenChange(!open)} aria-label="เปิดตัวกรอง">
        {open ? <X /> : <SlidersHorizontal />}
      </Button>
      {dockItems.map((item) => (
        <button
          key={item.value}
          type="button"
          className={cn(
            "group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm shadow-sm transition-all hover:-translate-y-2 hover:scale-110 lg:hover:translate-x-2 lg:hover:translate-y-0",
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
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground">
          <Filter className="size-5" />
        </div>
      )}
    </div>
  </div>
);

export { HomepageExperience };


