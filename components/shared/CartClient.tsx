"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, Minus, PackageCheck, Pencil, Plus, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppConfirmDialog } from "@/components/shared/AppConfirmDialog";
import { cn } from "@/lib/utils";

interface CartProduct {
  id: string;
  title: string;
  seller: string;
  sellerSlug: string;
  rarity: string;
  cardCode: string;
  conditionLabel: string;
  priceCents: number;
  imageUrl?: string | null;
}

interface StoredCartLine {
  id: string;
  title: string;
  seller: string;
  rarity: string;
  priceCents: number;
  imageUrl?: string | null;
  quantity: number;
}

interface CartLine extends StoredCartLine {
  product?: CartProduct;
}

interface CheckoutResponse {
  ok: boolean;
  productIds?: string[];
  orders?: Array<{ id: string; productId: string; amountCents: number }>;
  error?: {
    message: string;
  };
}

interface CartClientProps {
  products: CartProduct[];
}

const CART_STORAGE_KEY = "bidcard.cart";
const MAX_QUANTITY_PER_LISTING = 1;

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value / 100);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const toOptionalString = (value: unknown) => (typeof value === "string" ? value : null);

const parseCartLine = (value: unknown): StoredCartLine | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toOptionalString(value.id);
  const title = toOptionalString(value.title);
  const seller = toOptionalString(value.seller);
  const rarity = toOptionalString(value.rarity);
  const priceCents = typeof value.priceCents === "number" ? value.priceCents : null;
  const quantity = typeof value.quantity === "number" ? value.quantity : 1;

  if (!id || !title || !seller || !rarity || priceCents === null) {
    return null;
  }

  return {
    id,
    title,
    seller,
    rarity,
    priceCents,
    imageUrl: toOptionalString(value.imageUrl),
    quantity: Math.min(MAX_QUANTITY_PER_LISTING, Math.max(1, Math.trunc(quantity))),
  };
};

const normalizeCartLines = (lines: StoredCartLine[]) => {
  const uniqueLines = new Map<string, StoredCartLine>();

  for (const line of lines) {
    uniqueLines.set(line.id, {
      ...line,
      quantity: Math.min(MAX_QUANTITY_PER_LISTING, Math.max(1, Math.trunc(line.quantity))),
    });
  }

  return Array.from(uniqueLines.values());
};

const readStoredCart = () => {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeCartLines(parsed.flatMap((line) => {
      const parsedLine = parseCartLine(line);
      return parsedLine ? [parsedLine] : [];
    }));
  } catch {
    return [];
  }
};

const writeStoredCart = (lines: StoredCartLine[]) => {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCartLines(lines)));
  window.dispatchEvent(new Event("bidcard-cart-updated"));
};

const CartClient = ({ products }: CartClientProps) => {
  const [cartLines, setCartLines] = useState<StoredCartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [notice, setNotice] = useState("ตรวจรายการสินค้าในตะกร้าก่อนยืนยันคำสั่งซื้อ");
  const { confirm, confirmDialog } = useAppConfirmDialog();

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  useEffect(() => {
    setCartLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeStoredCart(cartLines);
    }
  }, [cartLines, hydrated]);

  const lines = useMemo<CartLine[]>(
    () =>
      cartLines.map((line) => {
        const product = productMap.get(line.id);
        return product
          ? {
              ...line,
              title: product.title,
              seller: product.seller,
              rarity: product.rarity,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
              product,
            }
          : line;
      }),
    [cartLines, productMap],
  );

  const availableLines = lines.filter((line) => Boolean(line.product));
  const unavailableLines = lines.filter((line) => !line.product);
  const cartTotalCents = availableLines.reduce((total, line) => total + line.priceCents * line.quantity, 0);
  const cartCount = availableLines.reduce((total, line) => total + line.quantity, 0);
  const recommendedProducts = products.filter((product) => !cartLines.some((line) => line.id === product.id)).slice(0, 8);

  const addProduct = (product: CartProduct) => {
    setCartLines((current) => {
      if (current.some((line) => line.id === product.id)) {
        return current.map((line) => (line.id === product.id ? { ...line, quantity: MAX_QUANTITY_PER_LISTING } : line));
      }

      return [
        ...current,
        {
          id: product.id,
          title: product.title,
          seller: product.seller,
          rarity: product.rarity,
          priceCents: product.priceCents,
          imageUrl: product.imageUrl,
          quantity: 1,
        },
      ];
    });
    setNotice(`เพิ่ม ${product.title} ลงตะกร้าแล้ว`);
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    const normalizedQuantity = Math.min(MAX_QUANTITY_PER_LISTING, Math.max(1, Math.trunc(nextQuantity)));
    setCartLines((current) => current.map((line) => (line.id === productId ? { ...line, quantity: normalizedQuantity } : line)));
    setNotice("ปรับรายการในตะกร้าแล้ว");
  };

  const removeLine = async (productId: string, title: string) => {
    const confirmed = await confirm({
      title: "ลบสินค้าออกจากตะกร้า",
      description: "รายการนี้จะถูกลบออกจากตะกร้า แต่สินค้าจะยังอยู่ในหน้าซื้อเลยหากยังพร้อมขาย",
      confirmLabel: "ลบสินค้า",
      cancelLabel: "เก็บไว้",
      tone: "destructive",
      details: [{ label: "สินค้า", value: title }],
    });

    if (!confirmed) {
      return;
    }

    setCartLines((current) => current.filter((line) => line.id !== productId));
    setNotice(`ลบ ${title} ออกจากตะกร้าแล้ว`);
  };

  const clearCart = async () => {
    const confirmed = await confirm({
      title: "ล้างตะกร้าสินค้า",
      description: "ระบบจะลบสินค้าทุกใบออกจากตะกร้าบนอุปกรณ์นี้",
      confirmLabel: "ล้างตะกร้า",
      cancelLabel: "ยกเลิก",
      tone: "destructive",
      details: [{ label: "จำนวนรายการ", value: `${cartCount.toLocaleString("th-TH")} รายการ` }],
    });

    if (!confirmed) {
      return;
    }

    setCartLines([]);
    setNotice("ล้างตะกร้าแล้ว");
  };

  const checkoutCart = async () => {
    if (availableLines.length === 0 || isCheckingOut) {
      return;
    }

    const confirmed = await confirm({
      title: "ยืนยันคำสั่งซื้อ",
      description: "ระบบจะสร้างคำสั่งซื้อจริง กันเงินไว้ใน escrow และแจ้งร้านค้าให้จัดส่งตาม SLA",
      confirmLabel: "ยืนยันสั่งซื้อ",
      cancelLabel: "ตรวจอีกครั้ง",
      tone: "success",
      details: [
        { label: "สินค้า", value: `${cartCount.toLocaleString("th-TH")} รายการ` },
        { label: "ยอดรวม", value: moneyFromCents(cartTotalCents) },
      ],
    });

    if (!confirmed) {
      return;
    }

    setIsCheckingOut(true);
    setNotice("กำลังสร้างคำสั่งซื้อและกันเงินไว้ใน escrow...");

    try {
      const response = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: availableLines.map((line) => line.id),
        }),
      });
      const result = (await response.json()) as CheckoutResponse;

      if (!response.ok || !result.ok) {
        setNotice(result.error?.message ?? "สั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      const purchasedIds = new Set(result.productIds ?? availableLines.map((line) => line.id));
      setCartLines((current) => current.filter((line) => !purchasedIds.has(line.id)));
      setNotice(`สั่งซื้อสำเร็จ ${result.orders?.length ?? purchasedIds.size} รายการ ตรวจสถานะได้ที่บัญชีของฉัน`);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "เชื่อมต่อระบบสั่งซื้อไม่สำเร็จ");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card className="neon-panel overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="size-5" />
                  รายการในตะกร้า
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">การ์ดแต่ละใบเป็นสินค้าเฉพาะรายการ ซื้อได้ 1 ใบต่อ listing</p>
              </div>
              {lines.length > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={clearCart}>
                  <Trash2 className="size-4" />
                  ล้างตะกร้า
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!hydrated ? (
              <div className="p-6 text-sm text-muted-foreground">กำลังโหลดตะกร้า...</div>
            ) : lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/5">
                  <ShoppingBag className="size-7 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">ยังไม่มีสินค้าในตะกร้า</h2>
                  <p className="mt-1 text-sm text-muted-foreground">เลือกการ์ดจากหน้าซื้อเลย แล้วกลับมาตรวจรายการก่อนสั่งซื้อ</p>
                </div>
                <Button asChild>
                  <Link href="/buy-now">ไปเลือกซื้อการ์ด</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {lines.map((line) => (
                  <CartLineRow
                    key={line.id}
                    line={line}
                    onRemove={() => removeLine(line.id, line.title)}
                    onQuantityChange={(quantity) => updateQuantity(line.id, quantity)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {recommendedProducts.length > 0 ? (
          <section className="neon-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">สินค้าแนะนำเพิ่มลงตะกร้า</h2>
                <p className="text-sm text-muted-foreground">เลือกจากรายการซื้อเลยที่ยังพร้อมขาย</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/buy-now">ดูทั้งหมด</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recommendedProducts.map((product) => (
                <div key={product.id} className="rounded-xl border border-white/10 bg-background/60 p-3">
                  <Link href={`/buy-now/${product.id}`} className="group block">
                    <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-white/5">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          fill
                          sizes="(min-width: 1280px) 18vw, 50vw"
                          className="object-contain transition group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <Badge variant="outline">{product.rarity}</Badge>
                    <strong className="mt-2 line-clamp-2 block text-sm">{product.title}</strong>
                    <span className="text-xs text-muted-foreground">{product.seller}</span>
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <strong className="text-primary">{moneyFromCents(product.priceCents)}</strong>
                    <Button type="button" size="sm" onClick={() => addProduct(product)}>
                      <Plus className="size-4" />
                      เพิ่ม
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        <Card className="neon-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-5" />
              สรุปคำสั่งซื้อ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>สินค้าพร้อมสั่งซื้อ</span>
                <strong className="text-foreground">{cartCount.toLocaleString("th-TH")} รายการ</strong>
              </div>
              <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-muted-foreground">ยอดรวม</span>
                <strong className="text-3xl font-black text-primary">{moneyFromCents(cartTotalCents)}</strong>
              </div>
            </div>

            {unavailableLines.length > 0 ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>มี {unavailableLines.length.toLocaleString("th-TH")} รายการที่ปิดขายแล้ว กรุณาลบออกก่อนสั่งซื้อ</span>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              className="h-12 w-full"
              disabled={availableLines.length === 0 || unavailableLines.length > 0 || isCheckingOut}
              onClick={checkoutCart}
            >
              <CheckCircle2 className="size-5" />
              {isCheckingOut ? "กำลังสั่งซื้อ..." : "ยืนยันสั่งซื้อ"}
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/buy-now">เลือกซื้อเพิ่ม</Link>
            </Button>
          </CardContent>
        </Card>

        <div
          className={cn(
            "rounded-2xl border p-4 text-sm",
            notice.includes("สำเร็จ") ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-muted-foreground",
          )}
        >
          {notice}
        </div>
      </aside>
      {confirmDialog}
    </div>
  );
};

const CartLineRow = ({
  line,
  onRemove,
  onQuantityChange,
}: {
  line: CartLine;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
}) => {
  const isAvailable = Boolean(line.product);
  const productHref = `/buy-now/${line.id}`;

  return (
    <div className={cn("grid gap-4 p-4 md:grid-cols-[112px_minmax(0,1fr)_220px]", !isAvailable && "bg-amber-500/10")}>
      <Link href={productHref} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white/5">
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt={line.title} fill sizes="112px" className="object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">ไม่มีรูป</div>
        )}
      </Link>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={isAvailable ? "outline" : "secondary"}>{isAvailable ? "พร้อมขาย" : "ปิดขายแล้ว"}</Badge>
          <Badge variant="outline">{line.rarity}</Badge>
          {line.product ? <Badge variant="outline">{line.product.conditionLabel}</Badge> : null}
        </div>
        <Link href={productHref} className="text-lg font-bold hover:text-primary">
          {line.title}
        </Link>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>ร้าน: {line.seller}</span>
          {line.product ? <span>รหัสการ์ด: {line.product.cardCode}</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={productHref}>
              <Eye className="size-4" />
              ดูสินค้า
            </Link>
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href={productHref}>
              <Pencil className="size-4" />
              แก้ไขรายการ
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="size-4" />
            ลบ
          </Button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-xl bg-white/5 p-3">
        <div>
          <span className="text-xs text-muted-foreground">ราคาต่อรายการ</span>
          <strong className="block text-xl text-primary">{moneyFromCents(line.priceCents)}</strong>
        </div>
        <div>
          <span className="mb-2 block text-xs text-muted-foreground">จำนวน</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={line.quantity <= 1}
              onClick={() => onQuantityChange(line.quantity - 1)}
              aria-label="ลดจำนวน"
            >
              <Minus />
            </Button>
            <div className="flex h-8 min-w-12 items-center justify-center rounded-md border border-white/10 bg-background/80 px-3 text-sm font-bold">
              {line.quantity}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={line.quantity >= MAX_QUANTITY_PER_LISTING}
              onClick={() => onQuantityChange(line.quantity + 1)}
              aria-label="เพิ่มจำนวน"
            >
              <Plus />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">listing นี้ซื้อได้สูงสุด 1 ใบ</p>
        </div>
      </div>
    </div>
  );
};

export { CartClient };
