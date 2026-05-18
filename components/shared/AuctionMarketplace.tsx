"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { useAppConfirmDialog } from "@/components/shared/AppConfirmDialog";
import { CartNavButton } from "@/components/shared/CartNavButton";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { CARD_GAME_NAME, cardSetDefinitions, getCardSetDefinition } from "@/lib/card-catalog";
import { cn } from "@/lib/utils";
import { listingSchema, shopRegistrationSchema, topUpSchema } from "@/lib/schemas";
import type {
  ActivityItem,
  AuctionProduct,
  ListingMode,
  MarketplaceSnapshot,
  ProductCategory,
  ProductRarity,
  ViewerSummary,
  WalletSummary,
} from "@/types/marketplace";

interface AuctionMarketplaceProps {
  initialData: MarketplaceSnapshot;
  initialSaleType?: ListingMode | "all";
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

interface TopUpResponse {
  ok: boolean;
  user?: {
    walletBalanceCents: number;
    bidLimitCents: number;
  };
  error?: {
    message: string;
  };
}

interface BidResponse {
  ok: boolean;
  product?: {
    id?: string;
    currentPriceCents: number;
    nextBidCents: number;
  };
  error?: {
    message: string;
  };
}

interface CreateProductResponse {
  ok: boolean;
  product?: {
    id: string;
  };
  error?: {
    message: string;
  };
}

interface CreateOrderResponse {
  ok: boolean;
  user?: {
    walletBalanceCents: number;
    bidLimitCents: number;
  };
  error?: {
    message: string;
  };
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

const categoryOptions: Array<ProductCategory | "all"> = ["all", ...cardSetDefinitions.map((set) => set.category)];
const categoryLabels = new Map<ProductCategory | "all", string>([
  ["all", "ทั้งหมด"],
  ...cardSetDefinitions.map((set) => [set.category, `${set.setCode} ${set.setName}`] as const),
]);

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

const AuctionMarketplace = ({ initialData, initialSaleType = "all" }: AuctionMarketplaceProps) => {
  const viewer = initialData.viewer;
  const isGuest = viewer.role === "GUEST";
  const isShop = viewer.role === "RESELLER";
  const isAdmin = viewer.role === "ADMIN";
  const canListProducts = isShop || isAdmin;
  const [wallet, setWallet] = useState<WalletSummary>(initialData.wallet);
  const [products, setProducts] = useState<AuctionProduct[]>(initialData.products);
  const [activities, setActivities] = useState<ActivityItem[]>(initialData.activities);
  const [filters, setFilters] = useState<FiltersState>({
    saleType: initialSaleType,
    category: "all",
    rarity: "all",
    query: "",
    minPrice: "",
    maxPrice: "",
  });
  const [sortMode, setSortMode] = useState<SortMode>("ending");
  const [notice, setNotice] = useState("ประมูลตัวอย่าง: การ์ดทุกใบหมดเวลาประมูลอีก 2 ปี วันที่ 28 เม.ย. 2028");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingMode, setListingMode] = useState<ListingMode>("auction");
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const { confirm, confirmDialog } = useAppConfirmDialog();

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

  const handleProductAction = async (product: AuctionProduct) => {
    if (isGuest) {
      setNotice(isAdmin ? "บัญชีผู้ดูแลใช้ดูแลระบบหลังบ้านเท่านั้น ไม่ใช้ซื้อหรือประมูลสินค้า" : "กรุณาสมัครสมาชิกหรือเข้าสู่ระบบก่อนซื้อและเสนอราคา");
      return;
    }

    if (product.mode === "buy") {
      if (wallet.balance < product.currentPrice) {
        setNotice(`ยอดเงินไม่พอสำหรับซื้อ ${product.title}`);
        setTopUpOpen(true);
        return;
      }

      if (initialData.currentUserId) {
        try {
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: product.id,
              buyerId: initialData.currentUserId,
            }),
          });
          const result = (await response.json()) as CreateOrderResponse;

          if (!response.ok || !result.ok || !result.user) {
            setNotice(result.error?.message ?? "สั่งซื้อไม่สำเร็จ");
            return;
          }

          const updatedUser = result.user;

          setWallet((current) => ({
            ...current,
            balance: Math.round(updatedUser.walletBalanceCents / 100),
            bidLimit: Math.round(updatedUser.bidLimitCents / 100),
          }));
          setProducts((current) => current.filter((item) => item.id !== product.id));
        } catch {
          setNotice("เชื่อมต่อ API คำสั่งซื้อไม่ได้");
          return;
        }
      } else {
        setWallet((current) => ({ ...current, balance: current.balance - product.currentPrice }));
      }
      addActivity("ซื้อสินค้า", `${product.title} ${formatMoney(product.currentPrice, true)}`);
      setNotice(`ซื้อสำเร็จ: ${product.title} จาก ${product.seller}`);
      return;
    }

    if (wallet.balance + wallet.bidLimit < product.nextBid) {
      setNotice(`ยอดเงินหรือวงเงินประมูลไม่พอสำหรับ ${product.title}`);
      setTopUpOpen(true);
      return;
    }

    const confirmed = await confirm({
      title: "ยืนยันการบิด",
      description: "ระบบจะบันทึกราคาเสนอของคุณทันที และอัปเดตแจ้งเตือนเมื่อมีสมาชิกคนอื่นบิดทับ",
      confirmLabel: "ยืนยันบิด",
      cancelLabel: "ยกเลิก",
      tone: "bid",
      details: [
        { label: "การ์ด", value: product.title },
        { label: "ราคาเสนอ", value: formatMoney(product.nextBid, true) },
      ],
    });

    if (!confirmed) {
      setNotice("ยกเลิกการบิดแล้ว");
      return;
    }

    if (initialData.currentUserId) {
      try {
        const response = await fetch("/api/bids", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
            bidderId: initialData.currentUserId,
            amountCents: product.nextBid * 100,
          }),
        });
        const result = (await response.json()) as BidResponse;

        if (!response.ok || !result.ok || !result.product) {
          setNotice(result.error?.message ?? "เสนอราคาไม่สำเร็จ");
          return;
        }

        const updatedProduct = result.product;

        setProducts((current) =>
          current.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  currentPrice: Math.round(updatedProduct.currentPriceCents / 100),
                  nextBid: Math.round(updatedProduct.nextBidCents / 100),
                  topBidder: viewer.displayName,
                }
              : item,
          ),
        );
      } catch {
        setNotice("เชื่อมต่อ API เสนอราคาไม่ได้");
        return;
      }
    } else {
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
    }

    setWallet((current) => ({ ...current, bidLimit: Math.max(0, current.bidLimit - product.nextBid) }));
    addActivity("เสนอราคา", `${product.title} ${formatMoney(product.nextBid, true)}`);
    setNotice(`ใส่ราคาแล้ว: ${product.title} ราคาปัจจุบัน ${formatMoney(product.nextBid, true)}`);
  };

  const handleTopUp = async () => {
    if (isGuest) {
      setNotice(isAdmin ? "บัญชีผู้ดูแลไม่ต้องเติมเงินในหน้าร้าน" : "กรุณาสมัครสมาชิกหรือเข้าสู่ระบบก่อนเติมเงิน");
      return;
    }

    const parsed = topUpSchema.safeParse({ amount: topUpAmount });
    if (!parsed.success) {
      setNotice("กรุณาระบุจำนวนเติมเงินตั้งแต่ ฿100 ถึง ฿50,000");
      return;
    }

    if (initialData.currentUserId) {
      try {
        const response = await fetch("/api/wallet/top-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: initialData.currentUserId,
            amountCents: parsed.data.amount * 100,
          }),
        });
        const result = (await response.json()) as TopUpResponse;

        if (!response.ok || !result.ok || !result.user) {
          setNotice(result.error?.message ?? "เติมเงินไม่สำเร็จ");
          return;
        }

        const updatedUser = result.user;

        setWallet((current) => ({
          ...current,
          balance: Math.round(updatedUser.walletBalanceCents / 100),
          bidLimit: Math.round(updatedUser.bidLimitCents / 100),
        }));
      } catch {
        setNotice("เชื่อมต่อ API เติมเงินไม่ได้");
        return;
      }
    } else {
      setWallet((current) => ({ ...current, balance: current.balance + parsed.data.amount }));
    }

    addActivity("เติมเงิน", `เพิ่มยอด ${formatMoney(parsed.data.amount, true)}`);
    setNotice(`เติมเงินสำเร็จ: ยอดคงเหลือใหม่ ${formatMoney(wallet.balance + parsed.data.amount)}`);
    setTopUpOpen(false);
  };

  const handleRegisterShop = () => {
    if (isGuest) {
      setNotice("กรุณาสมัครสมาชิกก่อนส่งคำขอเปิดร้านค้า");
      return;
    }

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

  const handleCreateListing = async (formData: FormData) => {
    if (!canListProducts) {
      setNotice(isGuest ? "กรุณาสมัครสมาชิกและสมัครร้านค้าก่อนลงสินค้า" : "บัญชีนี้ยังไม่ใช่ร้านค้า กรุณาสมัครร้านค้าก่อนลงสินค้า");
      return;
    }

    const parsed = listingSchema.safeParse({
      mode: listingMode,
      game: CARD_GAME_NAME,
      category: formData.get("category"),
      title: formData.get("title"),
      code: formData.get("code"),
      rarity: formData.get("rarity"),
      openingPrice: formData.get("openingPrice"),
      buyNowPrice: formData.get("buyNowPrice"),
      duration: formData.get("duration"),
      condition: formData.get("condition"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      setNotice("กรุณาตรวจสอบข้อมูลสินค้าก่อนลงขาย");
      return;
    }

    const listing = parsed.data;
    const cardSet = getCardSetDefinition(listing.category);
    const price = listing.mode === "auction" ? listing.openingPrice : listing.buyNowPrice;
    let createdProductId = `listing-${Date.now()}`;

    if (initialData.primaryShopId) {
      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...listing,
          }),
        });
        const result = (await response.json()) as CreateProductResponse;

        if (!response.ok || !result.ok || !result.product) {
          setNotice(result.error?.message ?? "ลงสินค้าไม่สำเร็จ");
          return;
        }

        createdProductId = result.product.id;
      } catch {
        setNotice("เชื่อมต่อ API ลงสินค้าไม่ได้");
        return;
      }
    }

    const newProduct: AuctionProduct = {
      id: createdProductId,
      title: listing.title,
      code: `${listing.code} · ${cardSet.label}`,
      seller: isAdmin ? "Admin Dev Shop" : "CardHunter Shop",
      shopId: isAdmin ? "admin-dev-shop" : "cardhunter",
      topBidder: "รอผู้เสนอราคา",
      mode: listing.mode,
      category: listing.category,
      rarity: listing.rarity,
      openingPrice: listing.openingPrice,
      currentPrice: price,
      nextBid: price + 250,
      watchers: 0,
      endsIn: listing.mode === "auction" ? "เหลือ 2 ปี (หมด 28 เม.ย. 2028)" : "พร้อมส่ง",
      auctionEndsAt: listing.mode === "auction" ? "2028-04-28T17:00:00.000Z" : null,
      imageUrl: null,
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
        viewer={viewer}
        wallet={wallet}
        onOpenTopUp={() => setTopUpOpen(true)}
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

          <RoleNotice viewer={viewer} />

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
          viewer={viewer}
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
      {confirmDialog}
    </div>
  );
};

interface SiteHeaderProps {
  viewer: ViewerSummary;
  wallet: WalletSummary;
  onOpenTopUp: () => void;
  onOpenListing: () => void;
}

const SiteHeader = ({ viewer, wallet, onOpenTopUp, onOpenListing }: SiteHeaderProps) => {
  const pathname = usePathname();
  const isGuest = viewer.role === "GUEST";
  const isMember = viewer.role === "MEMBER";
  const isShop = viewer.role === "RESELLER";
  const isSeller = isShop;
  const isAdmin = viewer.role === "ADMIN";
  const navItems = [
    { label: "ประมูล", icon: Trophy, href: "/auctions" },
    { label: "ซื้อเลย", icon: CreditCard, href: "/buy-now" },
    { label: "Reseller", icon: Store, href: "/shops" },
    { label: "รายการโปรด", icon: BookOpen, href: "/collection" },
    { label: "ช่วยเหลือ", icon: CircleHelp, href: "/help" },
  ];
  const profileInitials = viewer.displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 shadow-sm backdrop-blur">
      <div className="grid gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          ★
        </div>
        <div className="text-2xl font-bold tracking-tight">
          <span>BidCard</span> <span className="text-primary">TH</span>
        </div>
      </Link>

      <nav className="flex gap-2 overflow-x-auto md:justify-center">
        {navItems.map((item) => {
          const active = pathname === item.href || (pathname === "/" && item.href === "/auctions");

          return (
          <Button
            key={item.label}
            asChild
            variant="ghost"
            className={cn(
              "shrink-0 text-muted-foreground",
              active && "text-primary",
            )}
          >
            <Link href={item.href}>
            <item.icon data-icon="inline-start" />
            {item.label}
            </Link>
          </Button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 overflow-x-auto md:justify-end">
        {!isGuest ? (
          <Button asChild variant="outline" className="shrink-0">
          <Link href="/wallet">
          <Wallet data-icon="inline-start" />
          {formatMoney(wallet.balance)}
          </Link>
        </Button>
        ) : null}
        {isGuest ? (
          <>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
            <Button asChild className="shrink-0">
              <Link href="/register">สมัครสมาชิก</Link>
            </Button>
          </>
        ) : null}
        {isMember ? (
          <Button asChild variant="outline" className="hidden shrink-0 sm:inline-flex">
            <Link href="/seller/register">
              <Building2 data-icon="inline-start" />
              สมัคร Reseller
            </Link>
          </Button>
        ) : null}
        {isSeller || isAdmin ? (
          <Button type="button" className="hidden shrink-0 sm:inline-flex" onClick={onOpenListing}>
            <Plus data-icon="inline-start" />
            ลงสินค้า
          </Button>
        ) : null}
        {isAdmin ? (
          <Button asChild className="shrink-0">
            <Link href="/admin">หลังบ้าน Admin</Link>
          </Button>
        ) : null}
        <Button type="button" className="shrink-0 bg-wallet text-wallet-foreground hover:bg-wallet/90" onClick={onOpenTopUp}>
          เติมเงิน
        </Button>
        <NotificationBell className="relative shrink-0" />
        <CartNavButton className="shrink-0" />
        {!isGuest ? (
          <Button asChild variant="ghost" className="hidden gap-2 xl:flex">
          <Link href="/account">
          <Avatar className="size-9">
            <AvatarFallback>{profileInitials}</AvatarFallback>
          </Avatar>
          <span className="text-left leading-tight">
            <span className="block font-semibold">{viewer.displayName}</span>
            <span className="block text-xs text-muted-foreground">
              {isSeller ? "Reseller" : isAdmin ? "ผู้ดูแลทดสอบระบบ" : "สมาชิก"}
            </span>
          </span>
          <ChevronDown data-icon="inline-end" />
          </Link>
        </Button>
        ) : null}
        {isSeller || isAdmin ? (
          <Button type="button" className="xl:hidden" onClick={onOpenListing}>
          <Plus data-icon="inline-start" />
          ลงสินค้า
        </Button>
        ) : null}
      </div>
      </div>
      <div className="border-t bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        {isGuest ? "ยังไม่สมัครสมาชิก: ดูรายการได้ทั้งหมด แต่ต้องเข้าสู่ระบบก่อนซื้อ ประมูล เติมเงิน หรือสมัคร Reseller" : null}
        {isMember ? "โหมดสมาชิก: ซื้อสินค้า เสนอราคา เติมเงิน และสมัคร Reseller ได้จากเมนูด้านบน" : null}
        {isSeller ? "โหมด Reseller: ลงสินค้า เปิดประมูล และติดตามยอดขายจากเมนูร้านค้าได้" : null}
        {isAdmin ? "โหมดผู้ดูแลสำหรับทดสอบระบบ: ซื้อ ประมูล เติมเงิน ลงสินค้า และเปิดหลังบ้านได้ในบัญชีเดียว" : null}
      </div>
    </header>
  );
};

interface RoleNoticeProps {
  viewer: ViewerSummary;
}

const RoleNotice = ({ viewer }: RoleNoticeProps) => {
  if (viewer.role === "GUEST") {
    return (
      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div>
          <strong className="block">เริ่มใช้งาน BidCard TH</strong>
          <span className="text-sm text-muted-foreground">สมัครสมาชิกเพื่อซื้อ เติมเงิน และเสนอราคา หรือสมัครร้านค้าเพื่อเริ่มลงขายการ์ด</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">เข้าสู่ระบบ</Link>
        </Button>
        <Button asChild>
          <Link href="/register">สมัครสมาชิก</Link>
        </Button>
      </div>
    );
  }

  if (viewer.role === "MEMBER") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-wallet/20 bg-wallet/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span><strong>สมาชิกทั่วไป:</strong> พร้อมซื้อและประมูลแล้ว หากต้องการลงขายให้สมัครร้านค้าก่อน</span>
        <Button asChild variant="outline">
          <Link href="/seller/register">สมัครร้านค้า</Link>
        </Button>
      </div>
    );
  }

  if (viewer.role === "RESELLER") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span><strong>Reseller:</strong> ลงสินค้า เปิดประมูล และจัดการรายการขายได้จากปุ่มลงสินค้า</span>
        <Button asChild>
          <Link href="/shops">ดูตลาดร้านค้า</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span><strong>Admin:</strong> โหมดผู้ดูแลสำหรับทดสอบระบบ ใช้ซื้อ ประมูล เติมเงิน และลงสินค้าในร้าน Admin Dev Shop ได้</span>
      <Button asChild>
        <Link href="/admin">เปิดหลังบ้าน</Link>
      </Button>
    </div>
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
        {categoryOptions.map((value, index) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={value} />
            <span className="flex-1">{categoryLabels.get(value) ?? value.toUpperCase()}</span>
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
  onAction: (product: AuctionProduct) => void | Promise<void>;
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
        {product.mode === "auction" ? product.endsIn : "ซื้อเลย พร้อมส่ง"}
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
  viewer: ViewerSummary;
  wallet: WalletSummary;
  activities: ActivityItem[];
  onOpenTopUp: () => void;
  onOpenShop: () => void;
  onOpenListing: () => void;
}

const RightPanel = ({ viewer, wallet, activities, onOpenTopUp, onOpenShop, onOpenListing }: RightPanelProps) => {
  const canListProducts = viewer.role === "RESELLER" || viewer.role === "ADMIN";

  return (
    <aside className="flex flex-col gap-4 lg:grid lg:grid-cols-2 xl:sticky xl:top-24 xl:flex xl:h-[calc(100vh-7rem)] xl:overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {viewer.role === "GUEST" ? "ยังไม่สมัครสมาชิก" : viewer.role === "RESELLER" ? "เมนู Reseller" : viewer.role === "ADMIN" ? "Admin Test Mode" : "เมนูสมาชิก"}
          </CardTitle>
          <CardDescription>
            {viewer.role === "GUEST"
              ? "สมัครสมาชิกเพื่อซื้อ ประมูล เติมเงิน และสมัครเปิดร้าน"
              : viewer.role === "ADMIN"
                ? "โหมดผู้ดูแลสำหรับทดสอบตลาดและหลังบ้านในบัญชีเดียว"
                : viewer.role === "RESELLER"
                  ? "ลงสินค้า เปิดประมูล และติดตามยอดขาย"
                  : "ซื้อสินค้า เสนอราคา เติมเงิน และสมัครร้านค้าได้"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {viewer.role === "GUEST" ? (
            <>
              <Button asChild variant="outline">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
              <Button asChild>
                <Link href="/register">สมัครสมาชิก</Link>
              </Button>
            </>
          ) : canListProducts ? (
            <>
              <Button type="button" onClick={onOpenListing}>ลงสินค้า</Button>
              <Button asChild variant="outline">
                <Link href={viewer.role === "ADMIN" ? "/admin" : "/shops"}>
                  {viewer.role === "ADMIN" ? "เปิดหลังบ้าน" : "ดูหน้าร้าน"}
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={onOpenTopUp}>เติมเงิน</Button>
              <Button asChild variant="outline">
                <Link href="/seller/register">สมัครร้านค้า</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
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
        <Button asChild variant="outline">
          <Link href="/wallet">
            <History data-icon="inline-start" />
            ประวัติการเงิน
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ร้านค้าทดสอบ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[
            ["AD", "Admin Dev Shop", "ร้านทดสอบสำหรับผู้ดูแลระบบ"],
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
};

interface TopUpDialogProps {
  open: boolean;
  amount: string;
  onAmountChange: (amount: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

const TopUpDialog = ({ open, amount, onAmountChange, onOpenChange, onSubmit }: TopUpDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
      <div className="border-b bg-muted/40 p-6">
        <DialogHeader className="text-left">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-wallet text-wallet-foreground shadow-lg shadow-wallet/20">
            <Wallet className="size-5" />
          </div>
          <DialogTitle className="text-2xl">เติมเงินเข้ากระเป๋า</DialogTitle>
          <DialogDescription>เลือกจำนวนเงินหรือกรอกเอง ระบบทดสอบจะอัปเดตยอดทันทีหลังยืนยัน</DialogDescription>
        </DialogHeader>
      </div>
      <div className="grid gap-5 p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[500, 1000, 2000, 5000].map((value) => (
            <Button key={value} type="button" variant={amount === String(value) ? "default" : "outline"} onClick={() => onAmountChange(String(value))}>
              {value.toLocaleString("th-TH")}
            </Button>
          ))}
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <label className="text-sm font-medium text-muted-foreground" htmlFor="top-up-amount">จำนวนเงินที่ต้องการเติม</label>
          <Input id="top-up-amount" className="mt-2 h-12 text-lg font-bold" type="number" min={100} value={amount} onChange={(event) => onAmountChange(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button type="button" onClick={onSubmit}>ยืนยันเติมเงิน</Button>
        </DialogFooter>
      </div>
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
    <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
      <div className="border-b bg-muted/40 p-6">
        <DialogHeader className="text-left">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="size-5" />
          </div>
          <DialogTitle className="text-2xl">สมัครร้านค้า</DialogTitle>
          <DialogDescription>เปิดร้านขายการ์ด รับออเดอร์ และจัดการประมูลผ่านระบบ marketplace</DialogDescription>
        </DialogHeader>
      </div>
      <div className="grid gap-4 p-6">
        <div className="grid gap-3">
          <Input defaultValue="CardHunter Shop" aria-label="ชื่อร้าน" />
          <Input defaultValue="LINE: @cardhunter" aria-label="ช่องทางติดต่อ" />
          <Input defaultValue="ธนาคารตัวอย่าง 123-456" aria-label="บัญชีรับเงิน" />
        </div>
        <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          ระบบจะส่งคำขอให้แอดมินตรวจสอบก่อนเปิดขายจริง ร้านค้าที่อนุมัติแล้วจะลงขายและลงประมูลได้ทันที
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button type="button" onClick={onSubmit}>ส่งคำขอ</Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
);
interface ListingSheetProps {
  open: boolean;
  mode: ListingMode;
  onModeChange: (mode: ListingMode) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void | Promise<void>;
}

const ListingSheet = ({ open, mode, onModeChange, onOpenChange, onSubmit }: ListingSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-auto rounded-l-3xl p-0 sm:max-w-[560px] lg:max-w-[680px]">
      <SheetHeader className="border-b bg-muted/40 px-6 py-5">
        <SheetTitle className="text-2xl">ลงสินค้า</SheetTitle>
        <SheetDescription>สร้างรายการขายหรือประมูลแบบเป็นขั้นตอน ตรวจข้อมูลก่อนเผยแพร่</SheetDescription>
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

            <input type="hidden" name="game" value={CARD_GAME_NAME} />
            <Select name="category" defaultValue="op01" required>
              <SelectTrigger>
                <SelectValue placeholder="เลือกชุดการ์ด" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {cardSetDefinitions.map((set) => (
                    <SelectItem key={set.category} value={set.category}>{set.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Input name="title" required defaultValue="Yamato (SEC)" placeholder="ชื่อการ์ด" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="code" required defaultValue="OP01-121" pattern="OP[0-9]{2}-[0-9]{3}" placeholder="รหัสการ์ด เช่น OP01-121" />
              <Select name="rarity" defaultValue="SEC" required>
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
              <Input name="condition" required defaultValue="Near Mint (NM)" placeholder="สภาพการ์ด" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="openingPrice" required type="number" min={100} defaultValue={1000} placeholder="ราคาเปิดประมูล" />
              <Input name="buyNowPrice" required type="number" min={0} defaultValue={12750} placeholder="ราคาซื้อเลย" />
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
            <Input name="description" required defaultValue="การ์ดจริงพร้อมส่ง ตรวจสภาพแล้วก่อนลงขาย รูปตรงกับสินค้าที่ลงรายการ" placeholder="รายละเอียดสินค้าแบบครบถ้วน" />
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

