"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  Eye,
  Filter,
  Flame,
  Grid2X2,
  Heart,
  History,
  ImageUp,
  LayoutList,
  Menu,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trophy,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { listingSchema, shopRegistrationSchema, topUpSchema } from "@/lib/schemas";
import type {
  ActivityItem,
  AuctionProduct,
  ListingMode,
  MarketplaceSnapshot,
  ProductCategory,
  ProductRarity,
  WalletSummary,
} from "@/types/marketplace";

interface AuctionMarketplaceProps {
  initialData: MarketplaceSnapshot;
}

type SortMode = "ending" | "priceHigh" | "priceLow";

interface FiltersState {
  saleType: ListingMode | "all";
  category: ProductCategory | "all";
  rarity: ProductRarity | "all";
  query: string;
  minPrice: string;
  maxPrice: string;
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const formatMoney = (value: number, compact = false) =>
  (compact ? compactCurrencyFormatter : currencyFormatter)
    .format(value)
    .replace("THB", "฿");

const categoryLabels: Record<ProductCategory | "all", string> = {
  all: "ทั้งหมด",
  op01: "OP-01 ROMANCE DAWN",
  op02: "OP-02 PARAMOUNT WAR",
  op03: "OP-03 PILLARS OF STRENGTH",
  op04: "OP-04 KINGDOMS OF INTRIGUE",
  op05: "OP-05 AWAKENING OF THE NEW ERA",
};

const rarityOptions: ProductRarity[] = ["C", "UC", "R", "L", "SR", "SEC", "SP", "P"];

const rarityLabels: Record<ProductRarity, string> = {
  C: "Common (C)",
  UC: "Uncommon (UC)",
  R: "Rare (R)",
  L: "Leader (L)",
  SR: "Super Rare (SR)",
  SEC: "Secret Rare (SEC)",
  SP: "Special Rare (SP)",
  P: "Promo / Parallel (P)",
};

const AuctionMarketplace = ({ initialData }: AuctionMarketplaceProps) => {
  const [wallet, setWallet] = useState<WalletSummary>(initialData.wallet);
  const [products, setProducts] = useState<AuctionProduct[]>(initialData.products);
  const [activities, setActivities] = useState<ActivityItem[]>(initialData.activities);
  const [filters, setFilters] = useState<FiltersState>({
    saleType: "all",
    category: "all",
    rarity: "all",
    query: "",
    minPrice: "",
    maxPrice: "",
  });
  const [sortMode, setSortMode] = useState<SortMode>("ending");
  const [notice, setNotice] = useState("ประมูลใกล้จบ: Monkey D. Luffy (C) เหลือ 00:03:00 ราคาเปิดถัดไป ฿430");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingMode, setListingMode] = useState<ListingMode>("auction");
  const [topUpAmount, setTopUpAmount] = useState("1000");

  const addActivity = (title: string, detail: string) => {
    setActivities((current) => [
      { id: `act-${Date.now()}`, title, detail },
      ...current,
    ]);
  };

  const filteredProducts = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const minPrice = Number(filters.minPrice || 0);
    const maxPrice = Number(filters.maxPrice || Number.POSITIVE_INFINITY);

    return products
      .filter((product) => {
        const saleTypeMatch = filters.saleType === "all" || product.mode === filters.saleType;
        const categoryMatch = filters.category === "all" || product.category === filters.category;
        const rarityMatch = filters.rarity === "all" || product.rarity === filters.rarity;
        const priceMatch = product.currentPrice >= minPrice && product.currentPrice <= maxPrice;
        const queryMatch =
          !query ||
          `${product.title} ${product.code} ${product.seller}`.toLowerCase().includes(query);

        return saleTypeMatch && categoryMatch && rarityMatch && priceMatch && queryMatch;
      })
      .sort((left, right) => {
        if (sortMode === "priceHigh") return right.currentPrice - left.currentPrice;
        if (sortMode === "priceLow") return left.currentPrice - right.currentPrice;
        return left.endsIn.localeCompare(right.endsIn);
      });
  }, [filters, products, sortMode]);

  const auctionTotal = products.filter((product) => product.mode === "auction").length;
  const buyTotal = products.filter((product) => product.mode === "buy").length;
  const endingProducts = filteredProducts.filter((product) => product.mode === "auction" && !product.hot).slice(0, 4);
  const hotProducts = filteredProducts.filter((product) => product.hot || product.mode === "buy").slice(0, 20);

  const handleProductAction = (product: AuctionProduct) => {
    if (product.mode === "buy") {
      if (wallet.balance < product.currentPrice) {
        setNotice(`ยอดเงินไม่พอสำหรับซื้อ ${product.title}`);
        setTopUpOpen(true);
        return;
      }

      setWallet((current) => ({ ...current, balance: current.balance - product.currentPrice }));
      addActivity("ซื้อสินค้า", `${product.title} ${formatMoney(product.currentPrice, true)}`);
      setNotice(`ซื้อสำเร็จ: ${product.title} จาก ${product.seller}`);
      return;
    }

    if (wallet.balance + wallet.bidLimit < product.nextBid) {
      setNotice(`ยอดเงินหรือวงเงินประมูลไม่พอสำหรับ ${product.title}`);
      setTopUpOpen(true);
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              currentPrice: product.nextBid,
              nextBid: product.nextBid + Math.max(250, Math.round(product.nextBid * 0.04 / 100) * 100),
              topBidder: "CardHunter",
            }
          : item,
      ),
    );
    setWallet((current) => ({ ...current, bidLimit: Math.max(0, current.bidLimit - product.nextBid) }));
    addActivity("เสนอราคา", `${product.title} ${formatMoney(product.nextBid, true)}`);
    setNotice(`ใส่ราคาแล้ว: ${product.title} ราคาปัจจุบัน ${formatMoney(product.nextBid, true)}`);
  };

  const handleTopUp = () => {
    const parsed = topUpSchema.safeParse({ amount: topUpAmount });
    if (!parsed.success) {
      setNotice("กรุณาระบุจำนวนเติมเงินตั้งแต่ ฿100 ถึง ฿50,000");
      return;
    }

    setWallet((current) => ({ ...current, balance: current.balance + parsed.data.amount }));
    addActivity("เติมเงิน", `เพิ่มยอด ${formatMoney(parsed.data.amount, true)}`);
    setNotice(`เติมเงินสำเร็จ: ยอดคงเหลือใหม่ ${formatMoney(wallet.balance + parsed.data.amount)}`);
    setTopUpOpen(false);
  };

  const handleRegisterShop = () => {
    const parsed = shopRegistrationSchema.safeParse({
      shopName: "CardHunter Shop",
      contact: "@cardhunter",
      payoutAccount: "PromptPay",
      acceptedTerms: true,
    });

    if (!parsed.success) {
      setNotice("ข้อมูลสมัครร้านค้ายังไม่ครบ");
      return;
    }

    addActivity("สมัครร้านค้า", "ส่งคำขอ CardHunter Shop แล้ว");
    setNotice("สมัครร้านค้าแล้ว: ทีมงานจะตรวจสอบข้อมูลร้านของคุณ");
    setShopOpen(false);
  };

  const handleCreateListing = (formData: FormData) => {
    const parsed = listingSchema.safeParse({
      mode: listingMode,
      category: formData.get("category"),
      title: formData.get("title"),
      series: formData.get("series"),
      code: formData.get("code"),
      rarity: formData.get("rarity"),
      openingPrice: formData.get("openingPrice"),
      buyNowPrice: formData.get("buyNowPrice"),
      duration: formData.get("duration"),
      condition: formData.get("condition"),
    });

    if (!parsed.success) {
      setNotice("กรุณาตรวจสอบข้อมูลสินค้าก่อนลงขาย");
      return;
    }

    const listing = parsed.data;
    const price = listing.mode === "auction" ? listing.openingPrice : listing.buyNowPrice;
    const newProduct: AuctionProduct = {
      id: `listing-${Date.now()}`,
      title: listing.title,
      code: `${listing.series} ${listing.code}`,
      seller: "CardHunter Shop",
      shopId: "cardhunter",
      topBidder: "รอผู้เสนอราคา",
      mode: listing.mode,
      category: listing.category,
      rarity: listing.rarity,
      openingPrice: listing.openingPrice,
      currentPrice: price,
      nextBid: price + 250,
      watchers: 0,
      endsIn: listing.duration === "30 นาที" ? "00:30:00" : "3 วัน",
      imagePositionClass: "object-pos-1",
      hot: false,
    };

    setProducts((current) => [newProduct, ...current]);
    addActivity("ลงสินค้า", `${listing.title} (${listing.mode === "auction" ? "ประมูล" : "ซื้อเลย"})`);
    setNotice(`ลงสินค้าแล้ว: ${listing.title} พร้อมแสดงในตลาด`);
    setListingOpen(false);
  };

  const clearFilters = () => {
    setFilters({ saleType: "all", category: "all", rarity: "all", query: "", minPrice: "", maxPrice: "" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        wallet={wallet}
        onOpenTopUp={() => setTopUpOpen(true)}
        onOpenShop={() => setShopOpen(true)}
        onOpenListing={() => setListingOpen(true)}
      />

      <main className="grid grid-cols-1 gap-4 px-3 py-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_380px] xl:px-6">
        <FilterSidebar filters={filters} onChange={setFilters} onClear={clearFilters} />

        <section className="order-first flex min-w-0 flex-col gap-5 lg:order-none">
          <MarketToolbar
            query={filters.query}
            sortMode={sortMode}
            onQueryChange={(query) => setFilters((current) => ({ ...current, query }))}
            onSortChange={setSortMode}
          />

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            <span className="font-semibold">{notice}</span>
            <span className="ml-2 text-muted-foreground">ตัวอย่าง: 3 ร้านค้า / ลงขาย {buyTotal} ใบ / ลงประมูล {auctionTotal} ใบ / ครบ {rarityOptions.length} rarity</span>
          </div>

          <section className="flex flex-col gap-4">
            <SectionHeading title="ประมูลใกล้จบ" count={endingProducts.length + 20} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {endingProducts.map((product) => (
                <AuctionCard key={product.id} product={product} size="feature" onAction={handleProductAction} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading title="ประมูลกำลังมาแรง" hot />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {hotProducts.map((product) => (
                <AuctionCard key={product.id} product={product} size="compact" onAction={handleProductAction} />
              ))}
            </div>
          </section>
        </section>

        <RightPanel
          wallet={wallet}
          activities={activities}
          onOpenTopUp={() => setTopUpOpen(true)}
          onOpenShop={() => setShopOpen(true)}
          onOpenListing={() => setListingOpen(true)}
        />
      </main>

      <TopUpDialog
        open={topUpOpen}
        amount={topUpAmount}
        onAmountChange={setTopUpAmount}
        onOpenChange={setTopUpOpen}
        onSubmit={handleTopUp}
      />
      <ShopRegistrationDialog open={shopOpen} onOpenChange={setShopOpen} onSubmit={handleRegisterShop} />
      <ListingSheet
        open={listingOpen}
        mode={listingMode}
        onModeChange={setListingMode}
        onOpenChange={setListingOpen}
        onSubmit={handleCreateListing}
      />
    </div>
  );
};

interface SiteHeaderProps {
  wallet: WalletSummary;
  onOpenTopUp: () => void;
  onOpenShop: () => void;
  onOpenListing: () => void;
}

const SiteHeader = ({ wallet, onOpenTopUp, onOpenShop, onOpenListing }: SiteHeaderProps) => {
  const navItems = [
    { label: "ประมูล", icon: Trophy, active: true },
    { label: "ซื้อเลย", icon: CreditCard, active: false },
    { label: "ตลาดร้านค้า", icon: Store, active: false },
    { label: "คอลเลกชัน", icon: BookOpen, active: false },
    { label: "ช่วยเหลือ", icon: CircleHelp, active: false },
  ];

  return (
    <header className="sticky top-0 z-40 grid gap-3 border-b bg-card/95 px-4 py-3 shadow-sm backdrop-blur md:grid-cols-[auto_1fr_auto] md:items-center">
      <div className="flex items-center gap-2">
        <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          ★
        </div>
        <div className="text-2xl font-bold tracking-tight">
          <span>BidCard</span> <span className="text-primary">TH</span>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto md:justify-center">
        {navItems.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant={item.active ? "ghost" : "ghost"}
            className={cn(
              "shrink-0 text-muted-foreground",
              item.active && "text-primary",
            )}
          >
            <item.icon data-icon="inline-start" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="flex items-center gap-2 overflow-x-auto md:justify-end">
        <Button type="button" variant="outline" className="shrink-0">
          <Wallet data-icon="inline-start" />
          {formatMoney(wallet.balance)}
        </Button>
        <Button type="button" className="shrink-0 bg-wallet text-wallet-foreground hover:bg-wallet/90" onClick={onOpenTopUp}>
          เติมเงิน
        </Button>
        <Button type="button" variant="ghost" size="icon" className="relative shrink-0" aria-label="แจ้งเตือน">
          <Bell />
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">3</span>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="ตะกร้า">
          <ShoppingCart />
        </Button>
        <Button type="button" variant="ghost" className="hidden gap-2 xl:flex" onClick={onOpenShop}>
          <Avatar className="size-9">
            <AvatarFallback>CH</AvatarFallback>
          </Avatar>
          <span className="text-left leading-tight">
            <span className="block font-semibold">CardHunter</span>
            <span className="block text-xs text-muted-foreground">นักสะสม Lv.12</span>
          </span>
          <ChevronDown data-icon="inline-end" />
        </Button>
        <Button type="button" className="xl:hidden" onClick={onOpenListing}>
          <Plus data-icon="inline-start" />
          ลงสินค้า
        </Button>
      </div>
    </header>
  );
};

interface FilterSidebarProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onClear: () => void;
}

const FilterSidebar = ({ filters, onChange, onClear }: FilterSidebarProps) => (
  <aside className="rounded-lg border bg-card p-4 shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-auto">
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-lg font-semibold">ตัวกรอง</h2>
      <Button type="button" variant="link" className="h-auto p-0 text-primary" onClick={onClear}>
        ล้างทั้งหมด
      </Button>
    </div>

    <FilterBlock title="ประเภทสินค้า">
      <RadioGroup
        value={filters.saleType}
        onValueChange={(value) => onChange({ ...filters, saleType: value as ListingMode | "all" })}
        className="flex flex-col gap-3"
      >
        {[
          ["all", "ทั้งหมด"],
          ["auction", "ประมูล"],
          ["buy", "ซื้อเลย"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={value} />
            {label}
          </label>
        ))}
      </RadioGroup>
    </FilterBlock>

    <FilterBlock title="SET">
      <RadioGroup
        value={filters.category}
        onValueChange={(value) => onChange({ ...filters, category: value as ProductCategory | "all" })}
        className="flex flex-col gap-3"
      >
        {(["all", "op01", "op02", "op03", "op04", "op05"] as const).map((value, index) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={value} />
            <span className="flex-1">{categoryLabels[value]}</span>
            {index > 0 && <span className="text-xs text-muted-foreground">{[32, 32, 32, 32, 32][index - 1]}</span>}
          </label>
        ))}
      </RadioGroup>
      <Button type="button" variant="link" className="h-auto justify-start p-0 text-muted-foreground">
        เพิ่มเติม <ChevronDown data-icon="inline-end" />
      </Button>
    </FilterBlock>

    <FilterBlock title="NAME / CARD ID">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="ค้นหาซีรีส์" className="pr-10" />
      </div>
      {["OP-01 ROMANCE DAWN", "OP-02 PARAMOUNT WAR", "OP-03 PILLARS OF STRENGTH", "OP-05 AWAKENING"].map((label, index) => (
        <label key={label} className="flex items-center gap-2 text-sm">
          <Checkbox />
          <span className="flex-1">{label}</span>
          <span className="text-xs text-muted-foreground">{[321, 274, 210, 174][index]}</span>
        </label>
      ))}
    </FilterBlock>

    <FilterBlock title="ระดับความหายาก">
      <RadioGroup
        value={filters.rarity}
        onValueChange={(value) => onChange({ ...filters, rarity: value as ProductRarity | "all" })}
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="all" />
          ทั้งหมด
        </label>
        {rarityOptions.map((rarity) => (
          <label key={rarity} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={rarity} />
            <span className="flex-1">{rarityLabels[rarity]}</span>
            <span className="text-xs text-muted-foreground">20</span>
          </label>
        ))}
      </RadioGroup>
    </FilterBlock>

    <FilterBlock title="ช่วงราคา (฿)">
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          placeholder="ขั้นต่ำ"
          value={filters.minPrice}
          onChange={(event) => onChange({ ...filters, minPrice: event.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="สูงสุด"
          value={filters.maxPrice}
          onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })}
        />
      </div>
    </FilterBlock>
  </aside>
);

interface FilterBlockProps {
  title: string;
  children: React.ReactNode;
}

const FilterBlock = ({ title, children }: FilterBlockProps) => (
  <section className="border-t py-4 first:border-t-0 first:pt-0">
    <div className="mb-3 flex items-center justify-between text-sm font-semibold">
      <span>{title}</span>
      <ChevronDown className="rotate-180 text-muted-foreground" />
    </div>
    <div className="flex flex-col gap-3">{children}</div>
  </section>
);

interface MarketToolbarProps {
  query: string;
  sortMode: SortMode;
  onQueryChange: (query: string) => void;
  onSortChange: (mode: SortMode) => void;
}

const MarketToolbar = ({ query, sortMode, onQueryChange, onSortChange }: MarketToolbarProps) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div className="relative md:w-[430px]">
      <Input
        value={query}
        placeholder="ค้นหาการ์ด/ซีรีส์/ชื่อการ์ด..."
        className="h-11 bg-card pr-10"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
    <div className="flex items-center gap-2 overflow-x-auto">
      <Select value={sortMode} onValueChange={(value) => onSortChange(value as SortMode)}>
        <SelectTrigger className="h-11 w-[170px] bg-card">
          <SelectValue placeholder="เรียง" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ending">เรียง: ใกล้จบก่อน</SelectItem>
            <SelectItem value="priceHigh">ราคาสูงก่อน</SelectItem>
            <SelectItem value="priceLow">ราคาต่ำก่อน</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="button" variant="secondary" size="icon" aria-label="มุมมองกริด">
        <Grid2X2 />
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="มุมมองรายการ">
        <LayoutList />
      </Button>
      <Button type="button" variant="outline">
        <Filter data-icon="inline-start" />
        ตัวกรอง
        <Badge variant="destructive">2</Badge>
      </Button>
    </div>
  </div>
);

interface SectionHeadingProps {
  title: string;
  count?: number;
  hot?: boolean;
}

const SectionHeading = ({ title, count, hot = false }: SectionHeadingProps) => (
  <div className="flex items-center gap-2">
    {hot && <Flame className="text-primary" />}
    <h1 className="text-xl font-semibold">{title}</h1>
    {typeof count === "number" && <Badge variant="destructive">{count}</Badge>}
  </div>
);

interface AuctionCardProps {
  product: AuctionProduct;
  size: "feature" | "compact";
  onAction: (product: AuctionProduct) => void;
}

const AuctionCard = ({ product, size, onAction }: AuctionCardProps) => (
  <Card className="overflow-hidden rounded-lg p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className={cn("relative bg-muted", size === "feature" ? "aspect-[4/3]" : "aspect-[3/3.4]")}>
      <div
        className={cn("product-art absolute inset-0", product.imagePositionClass)}
        role="img"
        aria-label={product.title}
      />
      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
        <Clock3 data-icon="inline-start" />
        {product.mode === "auction" ? `กำลังจะจบใน ${product.endsIn}` : "ซื้อเลย พร้อมส่ง"}
      </div>
      <Button type="button" variant="secondary" size="icon-sm" className="absolute right-3 top-3 rounded-full bg-card/90" aria-label="ติดตาม">
        <Heart />
      </Button>
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        {(product.rarity === "SEC" || product.rarity === "SP" || product.rarity === "P") && <Badge className="bg-bid text-bid-foreground">จุดนิยม</Badge>}
        <Badge variant="secondary" className="bg-foreground/80 text-background">
          <Eye data-icon="inline-start" />
          {product.watchers}
        </Badge>
      </div>
    </div>
    <CardHeader className={cn("gap-1", size === "compact" ? "px-3 py-3" : "px-4 py-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className={cn("truncate", size === "compact" ? "text-sm" : "text-base")}>{product.title}</CardTitle>
          <CardDescription>{product.code}</CardDescription>
        </div>
        <Badge variant="outline">{product.rarity}</Badge>
      </div>
    </CardHeader>
    <CardContent className={cn("grid gap-2", size === "compact" ? "px-3 pb-3" : "px-4 pb-4")}>
      {size === "feature" ? (
        <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
          <PriceMetric label="ราคาเปิด" value={formatMoney(product.openingPrice, true)} />
          <PriceMetric label="ราคาปัจจุบัน" value={formatMoney(product.currentPrice, true)} strong />
          <PriceMetric label={product.mode === "auction" ? "ผู้เสนอสูงสุด" : "ร้านค้า"} value={product.mode === "auction" ? product.topBidder : product.seller} />
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2">
          <strong className="text-lg text-primary">{formatMoney(product.currentPrice, true)}</strong>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye /> {product.watchers}</span>
        </div>
      )}
    </CardContent>
    {size === "feature" && (
      <CardFooter className="px-4 pb-4">
        <Button type="button" className="w-full bg-bid text-white hover:bg-bid/90" onClick={() => onAction(product)}>
          {product.mode === "auction" ? "เสนอราคา" : "ซื้อเลย"}
        </Button>
      </CardFooter>
    )}
  </Card>
);

interface PriceMetricProps {
  label: string;
  value: string;
  strong?: boolean;
}

const PriceMetric = ({ label, value, strong = false }: PriceMetricProps) => (
  <div className="min-w-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <strong className={cn("block truncate", strong && "text-lg text-bid")}>{value}</strong>
  </div>
);

interface RightPanelProps {
  wallet: WalletSummary;
  activities: ActivityItem[];
  onOpenTopUp: () => void;
  onOpenShop: () => void;
  onOpenListing: () => void;
}

const RightPanel = ({ wallet, activities, onOpenTopUp, onOpenShop, onOpenListing }: RightPanelProps) => (
  <aside className="flex flex-col gap-4 lg:grid lg:grid-cols-2 xl:sticky xl:top-24 xl:flex xl:h-[calc(100vh-7rem)] xl:overflow-auto">
    <Card className="wallet-visual wallet-card-shadow overflow-hidden border-0 text-wallet-foreground">
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle>กระเป๋าเงิน</CardTitle>
          <Menu />
        </div>
        <CardDescription className="text-wallet-foreground/75">ยอดเงินคงเหลือ</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 grid gap-5">
        <div className="text-3xl font-bold">{formatMoney(wallet.balance)}</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <span>รอการชำระเงิน <strong className="block">{formatMoney(wallet.pendingPayment)}</strong></span>
          <span>วงเงินประมูล <strong className="block">{formatMoney(wallet.bidLimit)}</strong></span>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3">
      <Button type="button" className="bg-wallet text-wallet-foreground hover:bg-wallet/90" onClick={onOpenTopUp}>
        <Wallet data-icon="inline-start" />
        เติมเงิน
      </Button>
      <Button type="button" variant="outline">
        <History data-icon="inline-start" />
        ประวัติการเงิน
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>ตัวอย่างร้านค้า 3 ร้าน</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {[
          ["CH", "CardHunter Shop", "ลงขาย 27 ใบ / ประมูล 27 ใบ"],
          ["GL", "Grand Line Cards", "ลงขาย 27 ใบ / ประมูล 27 ใบ"],
          ["RD", "Romance Dawn Vault", "ลงขาย 26 ใบ / ประมูล 26 ใบ"],
        ].map(([initials, name, detail]) => (
          <div key={name} className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <strong className="block truncate">{name}</strong>
              <span className="text-sm text-muted-foreground">{detail}</span>
            </div>
          </div>
        ))}
        <div className="pt-1">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onOpenShop}>
            ไปยังร้านค้า
          </Button>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3">
      <Button type="button" variant="outline" className="text-wallet" onClick={onOpenShop}>
        <Building2 data-icon="inline-start" />
        สมัครร้านค้า
      </Button>
      <Button type="button" onClick={onOpenListing}>
        <Plus data-icon="inline-start" />
        ลงสินค้า
      </Button>
    </div>

    <Card className="lg:col-span-2 xl:col-span-1">
      <CardHeader>
        <CardTitle>รายการล่าสุด</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="border-b pb-3 last:border-b-0 last:pb-0">
            <strong className="block text-sm">{activity.title}</strong>
            <span className="text-sm text-muted-foreground">{activity.detail}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  </aside>
);

interface TopUpDialogProps {
  open: boolean;
  amount: string;
  onAmountChange: (amount: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

const TopUpDialog = ({ open, amount, onAmountChange, onOpenChange, onSubmit }: TopUpDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>เติมเงิน</DialogTitle>
        <DialogDescription>เลือกจำนวนเงินหรือกรอกเอง ระบบตัวอย่างจะอัปเดตยอดทันที</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[500, 1000, 2000, 5000].map((value) => (
          <Button key={value} type="button" variant="outline" onClick={() => onAmountChange(String(value))}>
            {formatMoney(value, true)}
          </Button>
        ))}
      </div>
      <Input type="number" min={100} step={100} value={amount} onChange={(event) => onAmountChange(event.target.value)} />
      <DialogFooter>
        <Button type="button" className="bg-wallet text-wallet-foreground hover:bg-wallet/90" onClick={onSubmit}>
          ยืนยันเติมเงิน
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface ShopRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

const ShopRegistrationDialog = ({ open, onOpenChange, onSubmit }: ShopRegistrationDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>สมัครร้านค้า</DialogTitle>
        <DialogDescription>เปิดร้านขายการ์ดและรับเงินผ่านระบบกระเป๋าเงิน</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <Input defaultValue="CardHunter Shop" aria-label="ชื่อร้าน" />
        <Input defaultValue="@cardhunter" aria-label="ช่องทางติดต่อ" />
        <Input placeholder="ธนาคาร / PromptPay" aria-label="บัญชีรับเงิน" />
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox defaultChecked />
          ยอมรับเงื่อนไขร้านค้าและค่าธรรมเนียมแพลตฟอร์ม
        </label>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onSubmit}>ส่งคำขอสมัครร้านค้า</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface ListingSheetProps {
  open: boolean;
  mode: ListingMode;
  onModeChange: (mode: ListingMode) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
}

const ListingSheet = ({ open, mode, onModeChange, onOpenChange, onSubmit }: ListingSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-auto p-0 sm:max-w-[560px] lg:max-w-[680px]">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>ลงสินค้า</SheetTitle>
        <SheetDescription>สร้างรายการขายหรือประมูลแบบ 3 ขั้นตอน</SheetDescription>
      </SheetHeader>
      <form action={onSubmit} className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          {["ข้อมูลสินค้า", "รายละเอียด", "ตรวจสอบ"].map((label, index) => (
            <div key={label} className={cn("flex items-center gap-2", index === 0 && "text-primary")}>
              <span className={cn("flex size-6 items-center justify-center rounded-full bg-muted", index === 0 && "bg-primary text-primary-foreground")}>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <ModeButton active={mode === "auction"} title="ประมูล" detail="ผู้สนใจเสนอราคา" onClick={() => onModeChange("auction")} />
              <ModeButton active={mode === "buy"} title="ซื้อเลย" detail="ราคาคงที่ทันที" onClick={() => onModeChange("buy")} />
            </div>

            <Select name="category" defaultValue="op01">
              <SelectTrigger>
                <SelectValue placeholder="เลือก SET" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="op01">OP-01 ROMANCE DAWN</SelectItem>
                  <SelectItem value="op02">OP-02 PARAMOUNT WAR</SelectItem>
                  <SelectItem value="op03">OP-03 PILLARS OF STRENGTH</SelectItem>
                  <SelectItem value="op04">OP-04 KINGDOMS OF INTRIGUE</SelectItem>
                  <SelectItem value="op05">OP-05 AWAKENING OF THE NEW ERA</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Input name="title" defaultValue="Monkey D. Luffy (SEC)" placeholder="ชื่อการ์ด" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="series" defaultValue="OP01" placeholder="ซีรีส์" />
              <Input name="code" defaultValue="119" placeholder="รหัสการ์ด" />
              <Select name="rarity" defaultValue="SEC">
                <SelectTrigger>
                  <SelectValue placeholder="ระดับความหายาก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {rarityOptions.map((rarity) => (
                      <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="openingPrice" type="number" min={100} defaultValue={1000} placeholder="ราคาเริ่ม" />
              <Input name="buyNowPrice" type="number" min={0} defaultValue={12750} placeholder="ราคาซื้อเลย" />
              <Select name="duration" defaultValue="3 วัน">
                <SelectTrigger>
                  <SelectValue placeholder="ระยะเวลา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="30 นาที">30 นาที</SelectItem>
                    <SelectItem value="3 วัน">3 วัน</SelectItem>
                    <SelectItem value="7 วัน">7 วัน</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Input name="condition" defaultValue="Near Mint" placeholder="สภาพการ์ด" />
            <div className="flex flex-wrap gap-2">
              {["Mint (M)", "Near Mint (NM)", "Excellent (EX)", "Good (G)", "Played (P)"].map((condition) => (
                <Badge key={condition} variant={condition === "Near Mint (NM)" ? "default" : "outline"}>{condition}</Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              <ImageUp />
              <strong className="text-foreground">คลิกหรือวางไฟล์ที่นี่</strong>
              <span>รองรับ JPG, PNG สูงสุด 10MB</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["object-pos-1", "object-pos-2", "object-pos-3"].map((position) => (
                <div
                  key={position}
                  className={cn("product-art aspect-square overflow-hidden rounded-md bg-muted", position)}
                  role="img"
                  aria-label="ตัวอย่างรูปการ์ด"
                />
              ))}
              <div className="flex aspect-square items-center justify-center rounded-md bg-foreground text-background">+2</div>
            </div>
            <Input placeholder="วางลิงก์ YouTube" aria-label="วิดีโอสินค้า" />
          </div>
        </div>

        <Separator />
        <SheetFooter className="p-0 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button type="submit">ถัดไป</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
);

interface ModeButtonProps {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}

const ModeButton = ({ active, title, detail, onClick }: ModeButtonProps) => (
  <Button
    type="button"
    variant="outline"
    className={cn("h-auto flex-col items-start gap-1 p-4 text-left", active && "border-primary bg-primary/5 text-primary")}
    onClick={onClick}
  >
    <strong>{title}</strong>
    <span className="text-xs text-muted-foreground">{detail}</span>
  </Button>
);

export { AuctionMarketplace };
