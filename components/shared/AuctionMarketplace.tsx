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
    .replace("THB", "เธฟ");

const categoryLabels: Record<ProductCategory | "all", string> = {
  all: "เธ—เธฑเนเธเธซเธกเธ”",
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

const AuctionMarketplace = ({ initialData, initialSaleType = "all" }: AuctionMarketplaceProps) => {
  const viewer = initialData.viewer;
  const isGuest = viewer.role === "GUEST";
  const isShop = viewer.role === "SHOP";
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
  const [notice, setNotice] = useState("เธเธฃเธฐเธกเธนเธฅเธ•เธฑเธงเธญเธขเนเธฒเธ: เธเธฒเธฃเนเธ”เธ—เธธเธเนเธเธซเธกเธ”เน€เธงเธฅเธฒเธเธฃเธฐเธกเธนเธฅเธญเธตเธ 2 เธเธต เธงเธฑเธเธ—เธตเน 28 เน€เธก.เธข. 2028");
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

  const handleProductAction = async (product: AuctionProduct) => {
    if (isGuest) {
      setNotice(isAdmin ? "เธเธฑเธเธเธตเธเธนเนเธ”เธนเนเธฅเนเธเนเธ”เธนเนเธฅเธฃเธฐเธเธเธซเธฅเธฑเธเธเนเธฒเธเน€เธ—เนเธฒเธเธฑเนเธ เนเธกเนเนเธเนเธเธทเนเธญเธซเธฃเธทเธญเธเธฃเธฐเธกเธนเธฅเธชเธดเธเธเนเธฒ" : "เธเธฃเธธเธ“เธฒเธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธซเธฃเธทเธญเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเธเธทเนเธญเนเธฅเธฐเน€เธชเธเธญเธฃเธฒเธเธฒ");
      return;
    }

    if (product.mode === "buy") {
      if (wallet.balance < product.currentPrice) {
        setNotice(`เธขเธญเธ”เน€เธเธดเธเนเธกเนเธเธญเธชเธณเธซเธฃเธฑเธเธเธทเนเธญ ${product.title}`);
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
            setNotice(result.error?.message ?? "เธชเธฑเนเธเธเธทเนเธญเนเธกเนเธชเธณเน€เธฃเนเธ");
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
          setNotice("เน€เธเธทเนเธญเธกเธ•เนเธญ API เธเธณเธชเธฑเนเธเธเธทเนเธญเนเธกเนเนเธ”เน");
          return;
        }
      } else {
        setWallet((current) => ({ ...current, balance: current.balance - product.currentPrice }));
      }
      addActivity("เธเธทเนเธญเธชเธดเธเธเนเธฒ", `${product.title} ${formatMoney(product.currentPrice, true)}`);
      setNotice(`เธเธทเนเธญเธชเธณเน€เธฃเนเธ: ${product.title} เธเธฒเธ ${product.seller}`);
      return;
    }

    if (wallet.balance + wallet.bidLimit < product.nextBid) {
      setNotice(`เธขเธญเธ”เน€เธเธดเธเธซเธฃเธทเธญเธงเธเน€เธเธดเธเธเธฃเธฐเธกเธนเธฅเนเธกเนเธเธญเธชเธณเธซเธฃเธฑเธ ${product.title}`);
      setTopUpOpen(true);
      return;
    }

    const confirmed = window.confirm(`ยืนยันการบิด ${product.title} ที่ราคา ${formatMoney(product.nextBid, true)} หรือไม่`);

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
          setNotice(result.error?.message ?? "เน€เธชเธเธญเธฃเธฒเธเธฒเนเธกเนเธชเธณเน€เธฃเนเธ");
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
        setNotice("เน€เธเธทเนเธญเธกเธ•เนเธญ API เน€เธชเธเธญเธฃเธฒเธเธฒเนเธกเนเนเธ”เน");
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
    addActivity("เน€เธชเธเธญเธฃเธฒเธเธฒ", `${product.title} ${formatMoney(product.nextBid, true)}`);
    setNotice(`เนเธชเนเธฃเธฒเธเธฒเนเธฅเนเธง: ${product.title} เธฃเธฒเธเธฒเธเธฑเธเธเธธเธเธฑเธ ${formatMoney(product.nextBid, true)}`);
  };

  const handleTopUp = async () => {
    if (isGuest) {
      setNotice(isAdmin ? "เธเธฑเธเธเธตเธเธนเนเธ”เธนเนเธฅเนเธกเนเธ•เนเธญเธเน€เธ•เธดเธกเน€เธเธดเธเนเธเธซเธเนเธฒเธฃเนเธฒเธ" : "เธเธฃเธธเธ“เธฒเธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธซเธฃเธทเธญเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเน€เธ•เธดเธกเน€เธเธดเธ");
      return;
    }

    const parsed = topUpSchema.safeParse({ amount: topUpAmount });
    if (!parsed.success) {
      setNotice("เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธณเธเธงเธเน€เธ•เธดเธกเน€เธเธดเธเธ•เธฑเนเธเนเธ•เน เธฟ100 เธ–เธถเธ เธฟ50,000");
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
          setNotice(result.error?.message ?? "เน€เธ•เธดเธกเน€เธเธดเธเนเธกเนเธชเธณเน€เธฃเนเธ");
          return;
        }

        const updatedUser = result.user;

        setWallet((current) => ({
          ...current,
          balance: Math.round(updatedUser.walletBalanceCents / 100),
          bidLimit: Math.round(updatedUser.bidLimitCents / 100),
        }));
      } catch {
        setNotice("เน€เธเธทเนเธญเธกเธ•เนเธญ API เน€เธ•เธดเธกเน€เธเธดเธเนเธกเนเนเธ”เน");
        return;
      }
    } else {
      setWallet((current) => ({ ...current, balance: current.balance + parsed.data.amount }));
    }

    addActivity("เน€เธ•เธดเธกเน€เธเธดเธ", `เน€เธเธดเนเธกเธขเธญเธ” ${formatMoney(parsed.data.amount, true)}`);
    setNotice(`เน€เธ•เธดเธกเน€เธเธดเธเธชเธณเน€เธฃเนเธ: เธขเธญเธ”เธเธเน€เธซเธฅเธทเธญเนเธซเธกเน ${formatMoney(wallet.balance + parsed.data.amount)}`);
    setTopUpOpen(false);
  };

  const handleRegisterShop = () => {
    if (isGuest) {
      setNotice("เธเธฃเธธเธ“เธฒเธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธเนเธญเธเธชเนเธเธเธณเธเธญเน€เธเธดเธ”เธฃเนเธฒเธเธเนเธฒ");
      return;
    }

    const parsed = shopRegistrationSchema.safeParse({
      shopName: "CardHunter Shop",
      contact: "@cardhunter",
      payoutAccount: "PromptPay",
      acceptedTerms: true,
    });

    if (!parsed.success) {
      setNotice("เธเนเธญเธกเธนเธฅเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเธขเธฑเธเนเธกเนเธเธฃเธ");
      return;
    }

    addActivity("เธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒ", "เธชเนเธเธเธณเธเธญ CardHunter Shop เนเธฅเนเธง");
    setNotice("เธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเนเธฅเนเธง: เธ—เธตเธกเธเธฒเธเธเธฐเธ•เธฃเธงเธเธชเธญเธเธเนเธญเธกเธนเธฅเธฃเนเธฒเธเธเธญเธเธเธธเธ“");
    setShopOpen(false);
  };

  const handleCreateListing = async (formData: FormData) => {
    if (!canListProducts) {
      setNotice(isGuest ? "เธเธฃเธธเธ“เธฒเธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเนเธฅเธฐเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเธเนเธญเธเธฅเธเธชเธดเธเธเนเธฒ" : "เธเธฑเธเธเธตเธเธตเนเธขเธฑเธเนเธกเนเนเธเนเธฃเนเธฒเธเธเนเธฒ เธเธฃเธธเธ“เธฒเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเธเนเธญเธเธฅเธเธชเธดเธเธเนเธฒ");
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
      setNotice("เธเธฃเธธเธ“เธฒเธ•เธฃเธงเธเธชเธญเธเธเนเธญเธกเธนเธฅเธชเธดเธเธเนเธฒเธเนเธญเธเธฅเธเธเธฒเธข");
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
          setNotice(result.error?.message ?? "เธฅเธเธชเธดเธเธเนเธฒเนเธกเนเธชเธณเน€เธฃเนเธ");
          return;
        }

        createdProductId = result.product.id;
      } catch {
        setNotice("เน€เธเธทเนเธญเธกเธ•เนเธญ API เธฅเธเธชเธดเธเธเนเธฒเนเธกเนเนเธ”เน");
        return;
      }
    }

    const newProduct: AuctionProduct = {
      id: createdProductId,
      title: listing.title,
      code: `${listing.code} · ${cardSet.label}`,
      seller: isAdmin ? "Admin Dev Shop" : "CardHunter Shop",
      shopId: isAdmin ? "admin-dev-shop" : "cardhunter",
      topBidder: "เธฃเธญเธเธนเนเน€เธชเธเธญเธฃเธฒเธเธฒ",
      mode: listing.mode,
      category: listing.category,
      rarity: listing.rarity,
      openingPrice: listing.openingPrice,
      currentPrice: price,
      nextBid: price + 250,
      watchers: 0,
      endsIn: listing.mode === "auction" ? "เน€เธซเธฅเธทเธญ 2 เธเธต (เธซเธกเธ” 28 เน€เธก.เธข. 2028)" : "เธเธฃเนเธญเธกเธชเนเธ",
      auctionEndsAt: listing.mode === "auction" ? "2028-04-28T17:00:00.000Z" : null,
      imageUrl: null,
      imagePositionClass: "object-pos-1",
      hot: false,
    };

    setProducts((current) => [newProduct, ...current]);
    addActivity("เธฅเธเธชเธดเธเธเนเธฒ", `${listing.title} (${listing.mode === "auction" ? "เธเธฃเธฐเธกเธนเธฅ" : "เธเธทเนเธญเน€เธฅเธข"})`);
    setNotice(`เธฅเธเธชเธดเธเธเนเธฒเนเธฅเนเธง: ${listing.title} เธเธฃเนเธญเธกเนเธชเธ”เธเนเธเธ•เธฅเธฒเธ”`);
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
            <span className="ml-2 text-muted-foreground">เธ•เธฑเธงเธญเธขเนเธฒเธ: 3 เธฃเนเธฒเธเธเนเธฒ / เธฅเธเธเธฒเธข {buyTotal} เนเธ / เธฅเธเธเธฃเธฐเธกเธนเธฅ {auctionTotal} เนเธ / เธเธฃเธ {rarityOptions.length} rarity</span>
          </div>

          <section className="flex flex-col gap-4">
            <SectionHeading title="เธเธฃเธฐเธกเธนเธฅเนเธเธฅเนเธเธ" count={endingProducts.length + 20} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {endingProducts.map((product) => (
                <AuctionCard key={product.id} product={product} size="feature" onAction={handleProductAction} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading title="เธเธฃเธฐเธกเธนเธฅเธเธณเธฅเธฑเธเธกเธฒเนเธฃเธ" hot />
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
  const isShop = viewer.role === "SHOP";
  const isAdmin = viewer.role === "ADMIN";
  const navItems = [
    { label: "เธเธฃเธฐเธกเธนเธฅ", icon: Trophy, href: "/auctions" },
    { label: "เธเธทเนเธญเน€เธฅเธข", icon: CreditCard, href: "/buy-now" },
    { label: "เธ•เธฅเธฒเธ”เธฃเนเธฒเธเธเนเธฒ", icon: Store, href: "/shops" },
    { label: "เธเธญเธฅเน€เธฅเธเธเธฑเธ", icon: BookOpen, href: "/collection" },
    { label: "เธเนเธงเธขเน€เธซเธฅเธทเธญ", icon: CircleHelp, href: "/help" },
  ];
  const profileInitials = viewer.displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 shadow-sm backdrop-blur">
      <div className="grid gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          โ…
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
              <Link href="/login">เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ</Link>
            </Button>
            <Button asChild className="shrink-0">
              <Link href="/register">เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ</Link>
            </Button>
          </>
        ) : null}
        {isMember ? (
          <Button asChild variant="outline" className="hidden shrink-0 sm:inline-flex">
            <Link href="/seller/register">
              <Building2 data-icon="inline-start" />
              เธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒ
            </Link>
          </Button>
        ) : null}
        {isShop || isAdmin ? (
          <Button type="button" className="hidden shrink-0 sm:inline-flex" onClick={onOpenListing}>
            <Plus data-icon="inline-start" />
            เธฅเธเธชเธดเธเธเนเธฒ
          </Button>
        ) : null}
        {isAdmin ? (
          <Button asChild className="shrink-0">
            <Link href="/admin">เธซเธฅเธฑเธเธเนเธฒเธ Admin</Link>
          </Button>
        ) : null}
        <Button type="button" className="shrink-0 bg-wallet text-wallet-foreground hover:bg-wallet/90" onClick={onOpenTopUp}>
          เน€เธ•เธดเธกเน€เธเธดเธ
        </Button>
        <NotificationBell className="relative shrink-0" />
        <Button asChild variant="ghost" size="icon" className="shrink-0" aria-label="เธ•เธฐเธเธฃเนเธฒ">
          <Link href="/cart">
          <ShoppingCart />
          </Link>
        </Button>
        {!isGuest ? (
          <Button asChild variant="ghost" className="hidden gap-2 xl:flex">
          <Link href="/account">
          <Avatar className="size-9">
            <AvatarFallback>{profileInitials}</AvatarFallback>
          </Avatar>
          <span className="text-left leading-tight">
            <span className="block font-semibold">{viewer.displayName}</span>
            <span className="block text-xs text-muted-foreground">
              {isShop ? "ร้านค้า" : isAdmin ? "ผู้ดูแลทดสอบระบบ" : "สมาชิก"}
            </span>
          </span>
          <ChevronDown data-icon="inline-end" />
          </Link>
        </Button>
        ) : null}
        {isShop || isAdmin ? (
          <Button type="button" className="xl:hidden" onClick={onOpenListing}>
          <Plus data-icon="inline-start" />
          เธฅเธเธชเธดเธเธเนเธฒ
        </Button>
        ) : null}
      </div>
      </div>
      <div className="border-t bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        {isGuest ? "เธขเธฑเธเนเธกเนเนเธ”เนเธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ: เธ”เธนเธฃเธฒเธขเธเธฒเธฃเนเธ”เนเธ—เธฑเนเธเธซเธกเธ” เนเธ•เนเธ•เนเธญเธเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเธเธทเนเธญ เธเธฃเธฐเธกเธนเธฅ เน€เธ•เธดเธกเน€เธเธดเธ เธซเธฃเธทเธญเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒ" : null}
        {isMember ? "เนเธซเธกเธ”เธชเธกเธฒเธเธดเธ: เธเธทเนเธญเธชเธดเธเธเนเธฒ เน€เธชเธเธญเธฃเธฒเธเธฒ เน€เธ•เธดเธกเน€เธเธดเธ เนเธฅเธฐเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเนเธ”เนเธเธฒเธเน€เธกเธเธนเธ”เนเธฒเธเธเธ" : null}
        {isShop ? "เนเธซเธกเธ”เธฃเนเธฒเธเธเนเธฒ: เธฅเธเธชเธดเธเธเนเธฒ เน€เธเธดเธ”เธเธฃเธฐเธกเธนเธฅ เนเธฅเธฐเธ•เธดเธ”เธ•เธฒเธกเธขเธญเธ”เธเธฒเธขเธเธฒเธเน€เธกเธเธนเธฃเนเธฒเธเธเนเธฒเนเธ”เน" : null}
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
          <strong className="block">เน€เธฃเธดเนเธกเนเธเนเธเธฒเธ BidCard TH</strong>
          <span className="text-sm text-muted-foreground">เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเน€เธเธทเนเธญเธเธทเนเธญ เน€เธ•เธดเธกเน€เธเธดเธ เนเธฅเธฐเน€เธชเธเธญเธฃเธฒเธเธฒ เธซเธฃเธทเธญเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเน€เธเธทเนเธญเน€เธฃเธดเนเธกเธฅเธเธเธฒเธขเธเธฒเธฃเนเธ”</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ</Link>
        </Button>
        <Button asChild>
          <Link href="/register">เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ</Link>
        </Button>
      </div>
    );
  }

  if (viewer.role === "MEMBER") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-wallet/20 bg-wallet/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span><strong>เธชเธกเธฒเธเธดเธเธ—เธฑเนเธงเนเธ:</strong> เธเธฃเนเธญเธกเธเธทเนเธญเนเธฅเธฐเธเธฃเธฐเธกเธนเธฅเนเธฅเนเธง เธซเธฒเธเธ•เนเธญเธเธเธฒเธฃเธฅเธเธเธฒเธขเนเธซเนเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒเธเนเธญเธ</span>
        <Button asChild variant="outline">
          <Link href="/seller/register">เธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒ</Link>
        </Button>
      </div>
    );
  }

  if (viewer.role === "SHOP") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span><strong>เธฃเนเธฒเธเธเนเธฒ:</strong> เธฅเธเธชเธดเธเธเนเธฒ เน€เธเธดเธ”เธเธฃเธฐเธกเธนเธฅ เนเธฅเธฐเธเธฑเธ”เธเธฒเธฃเธฃเธฒเธขเธเธฒเธฃเธเธฒเธขเนเธ”เนเธเธฒเธเธเธธเนเธกเธฅเธเธชเธดเธเธเนเธฒ</span>
        <Button asChild>
          <Link href="/shops">เธ”เธนเธ•เธฅเธฒเธ”เธฃเนเธฒเธเธเนเธฒ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span><strong>Admin:</strong> โหมดผู้ดูแลสำหรับทดสอบระบบ ใช้ซื้อ ประมูล เติมเงิน และลงสินค้าในร้าน Admin Dev Shop ได้</span>
      <Button asChild>
        <Link href="/admin">เน€เธเธดเธ”เธซเธฅเธฑเธเธเนเธฒเธ</Link>
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
      <h2 className="text-lg font-semibold">เธ•เธฑเธงเธเธฃเธญเธ</h2>
      <Button type="button" variant="link" className="h-auto p-0 text-primary" onClick={onClear}>
        เธฅเนเธฒเธเธ—เธฑเนเธเธซเธกเธ”
      </Button>
    </div>

    <FilterBlock title="เธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ">
      <RadioGroup
        value={filters.saleType}
        onValueChange={(value) => onChange({ ...filters, saleType: value as ListingMode | "all" })}
        className="flex flex-col gap-3"
      >
        {[
          ["all", "เธ—เธฑเนเธเธซเธกเธ”"],
          ["auction", "เธเธฃเธฐเธกเธนเธฅ"],
          ["buy", "เธเธทเนเธญเน€เธฅเธข"],
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
        เน€เธเธดเนเธกเน€เธ•เธดเธก <ChevronDown data-icon="inline-end" />
      </Button>
    </FilterBlock>

    <FilterBlock title="NAME / CARD ID">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="เธเนเธเธซเธฒเธเธตเธฃเธตเธชเน" className="pr-10" />
      </div>
      {["OP-01 ROMANCE DAWN", "OP-02 PARAMOUNT WAR", "OP-03 PILLARS OF STRENGTH", "OP-05 AWAKENING"].map((label, index) => (
        <label key={label} className="flex items-center gap-2 text-sm">
          <Checkbox />
          <span className="flex-1">{label}</span>
          <span className="text-xs text-muted-foreground">{[321, 274, 210, 174][index]}</span>
        </label>
      ))}
    </FilterBlock>

    <FilterBlock title="เธฃเธฐเธ”เธฑเธเธเธงเธฒเธกเธซเธฒเธขเธฒเธ">
      <RadioGroup
        value={filters.rarity}
        onValueChange={(value) => onChange({ ...filters, rarity: value as ProductRarity | "all" })}
        className="flex flex-col gap-3"
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="all" />
          เธ—เธฑเนเธเธซเธกเธ”
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

    <FilterBlock title="เธเนเธงเธเธฃเธฒเธเธฒ (เธฟ)">
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          placeholder="เธเธฑเนเธเธ•เนเธณ"
          value={filters.minPrice}
          onChange={(event) => onChange({ ...filters, minPrice: event.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="เธชเธนเธเธชเธธเธ”"
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
        placeholder="เธเนเธเธซเธฒเธเธฒเธฃเนเธ”/เธเธตเธฃเธตเธชเน/เธเธทเนเธญเธเธฒเธฃเนเธ”..."
        className="h-11 bg-card pr-10"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
    <div className="flex items-center gap-2 overflow-x-auto">
      <Select value={sortMode} onValueChange={(value) => onSortChange(value as SortMode)}>
        <SelectTrigger className="h-11 w-[170px] bg-card">
          <SelectValue placeholder="เน€เธฃเธตเธขเธ" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ending">เน€เธฃเธตเธขเธ: เนเธเธฅเนเธเธเธเนเธญเธ</SelectItem>
            <SelectItem value="priceHigh">เธฃเธฒเธเธฒเธชเธนเธเธเนเธญเธ</SelectItem>
            <SelectItem value="priceLow">เธฃเธฒเธเธฒเธ•เนเธณเธเนเธญเธ</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="button" variant="secondary" size="icon" aria-label="เธกเธธเธกเธกเธญเธเธเธฃเธดเธ”">
        <Grid2X2 />
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="เธกเธธเธกเธกเธญเธเธฃเธฒเธขเธเธฒเธฃ">
        <LayoutList />
      </Button>
      <Button type="button" variant="outline">
        <Filter data-icon="inline-start" />
        เธ•เธฑเธงเธเธฃเธญเธ
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
        {product.mode === "auction" ? product.endsIn : "เธเธทเนเธญเน€เธฅเธข เธเธฃเนเธญเธกเธชเนเธ"}
      </div>
      <Button type="button" variant="secondary" size="icon-sm" className="absolute right-3 top-3 rounded-full bg-card/90" aria-label="เธ•เธดเธ”เธ•เธฒเธก">
        <Heart />
      </Button>
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        {(product.rarity === "SEC" || product.rarity === "SP" || product.rarity === "P") && <Badge className="bg-bid text-bid-foreground">เธเธธเธ”เธเธดเธขเธก</Badge>}
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
          <PriceMetric label="เธฃเธฒเธเธฒเน€เธเธดเธ”" value={formatMoney(product.openingPrice, true)} />
          <PriceMetric label="เธฃเธฒเธเธฒเธเธฑเธเธเธธเธเธฑเธ" value={formatMoney(product.currentPrice, true)} strong />
          <PriceMetric label={product.mode === "auction" ? "เธเธนเนเน€เธชเธเธญเธชเธนเธเธชเธธเธ”" : "เธฃเนเธฒเธเธเนเธฒ"} value={product.mode === "auction" ? product.topBidder : product.seller} />
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
          {product.mode === "auction" ? "เน€เธชเธเธญเธฃเธฒเธเธฒ" : "เธเธทเนเธญเน€เธฅเธข"}
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
  const canListProducts = viewer.role === "SHOP" || viewer.role === "ADMIN";

  return (
    <aside className="flex flex-col gap-4 lg:grid lg:grid-cols-2 xl:sticky xl:top-24 xl:flex xl:h-[calc(100vh-7rem)] xl:overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {viewer.role === "GUEST" ? "ยังไม่สมัครสมาชิก" : viewer.role === "SHOP" ? "เมนูร้านค้า" : viewer.role === "ADMIN" ? "Admin Test Mode" : "เมนูสมาชิก"}
          </CardTitle>
          <CardDescription>
            {viewer.role === "GUEST"
              ? "สมัครสมาชิกเพื่อซื้อ ประมูล เติมเงิน และสมัครเปิดร้าน"
              : viewer.role === "ADMIN"
                ? "โหมดผู้ดูแลสำหรับทดสอบตลาดและหลังบ้านในบัญชีเดียว"
                : viewer.role === "SHOP"
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>เน€เธ•เธดเธกเน€เธเธดเธ</DialogTitle>
        <DialogDescription>เน€เธฅเธทเธญเธเธเธณเธเธงเธเน€เธเธดเธเธซเธฃเธทเธญเธเธฃเธญเธเน€เธญเธ เธฃเธฐเธเธเธ•เธฑเธงเธญเธขเนเธฒเธเธเธฐเธญเธฑเธเน€เธ”เธ•เธขเธญเธ”เธ—เธฑเธเธ—เธต</DialogDescription>
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
          เธขเธทเธเธขเธฑเธเน€เธ•เธดเธกเน€เธเธดเธ
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
        <DialogTitle>เธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒ</DialogTitle>
        <DialogDescription>เน€เธเธดเธ”เธฃเนเธฒเธเธเธฒเธขเธเธฒเธฃเนเธ”เนเธฅเธฐเธฃเธฑเธเน€เธเธดเธเธเนเธฒเธเธฃเธฐเธเธเธเธฃเธฐเน€เธเนเธฒเน€เธเธดเธ</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <Input defaultValue="CardHunter Shop" aria-label="เธเธทเนเธญเธฃเนเธฒเธ" />
        <Input defaultValue="@cardhunter" aria-label="เธเนเธญเธเธ—เธฒเธเธ•เธดเธ”เธ•เนเธญ" />
        <Input placeholder="เธเธเธฒเธเธฒเธฃ / PromptPay" aria-label="เธเธฑเธเธเธตเธฃเธฑเธเน€เธเธดเธ" />
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox defaultChecked />
          เธขเธญเธกเธฃเธฑเธเน€เธเธทเนเธญเธเนเธเธฃเนเธฒเธเธเนเธฒเนเธฅเธฐเธเนเธฒเธเธฃเธฃเธกเน€เธเธตเธขเธกเนเธเธฅเธ•เธเธญเธฃเนเธก
        </label>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onSubmit}>เธชเนเธเธเธณเธเธญเธชเธกเธฑเธเธฃเธฃเนเธฒเธเธเนเธฒ</Button>
      </DialogFooter>
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
    <SheetContent className="w-full overflow-auto p-0 sm:max-w-[560px] lg:max-w-[680px]">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>เธฅเธเธชเธดเธเธเนเธฒ</SheetTitle>
        <SheetDescription>เธชเธฃเนเธฒเธเธฃเธฒเธขเธเธฒเธฃเธเธฒเธขเธซเธฃเธทเธญเธเธฃเธฐเธกเธนเธฅเนเธเธ 3 เธเธฑเนเธเธ•เธญเธ</SheetDescription>
      </SheetHeader>
      <form action={onSubmit} className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          {["เธเนเธญเธกเธนเธฅเธชเธดเธเธเนเธฒ", "เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”", "เธ•เธฃเธงเธเธชเธญเธ"].map((label, index) => (
            <div key={label} className={cn("flex items-center gap-2", index === 0 && "text-primary")}>
              <span className={cn("flex size-6 items-center justify-center rounded-full bg-muted", index === 0 && "bg-primary text-primary-foreground")}>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <ModeButton active={mode === "auction"} title="เธเธฃเธฐเธกเธนเธฅ" detail="เธเธนเนเธชเธเนเธเน€เธชเธเธญเธฃเธฒเธเธฒ" onClick={() => onModeChange("auction")} />
              <ModeButton active={mode === "buy"} title="เธเธทเนเธญเน€เธฅเธข" detail="เธฃเธฒเธเธฒเธเธเธ—เธตเนเธ—เธฑเธเธ—เธต" onClick={() => onModeChange("buy")} />
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
              <Select name="duration" defaultValue="3 เธงเธฑเธ">
                <SelectTrigger>
                  <SelectValue placeholder="เธฃเธฐเธขเธฐเน€เธงเธฅเธฒ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="30 เธเธฒเธ—เธต">30 เธเธฒเธ—เธต</SelectItem>
                    <SelectItem value="3 เธงเธฑเธ">3 เธงเธฑเธ</SelectItem>
                    <SelectItem value="7 เธงเธฑเธ">7 เธงเธฑเธ</SelectItem>
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
              <strong className="text-foreground">เธเธฅเธดเธเธซเธฃเธทเธญเธงเธฒเธเนเธเธฅเนเธ—เธตเนเธเธตเน</strong>
              <span>เธฃเธญเธเธฃเธฑเธ JPG, PNG เธชเธนเธเธชเธธเธ” 10MB</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["object-pos-1", "object-pos-2", "object-pos-3"].map((position) => (
                <div
                  key={position}
                  className={cn("product-art aspect-square overflow-hidden rounded-md bg-muted", position)}
                  role="img"
                  aria-label="เธ•เธฑเธงเธญเธขเนเธฒเธเธฃเธนเธเธเธฒเธฃเนเธ”"
                />
              ))}
              <div className="flex aspect-square items-center justify-center rounded-md bg-foreground text-background">+2</div>
            </div>
            <Input placeholder="เธงเธฒเธเธฅเธดเธเธเน YouTube" aria-label="เธงเธดเธ”เธตเนเธญเธชเธดเธเธเนเธฒ" />
          </div>
        </div>

        <Separator />
        <SheetFooter className="p-0 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            เธขเธเน€เธฅเธดเธ
          </Button>
          <Button type="submit">เธ–เธฑเธ”เนเธ</Button>
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

