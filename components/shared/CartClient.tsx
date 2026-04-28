"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CartProduct {
  id: string;
  title: string;
  seller: string;
  rarity: string;
  priceCents: number;
}

interface CartLine extends CartProduct {
  quantity: number;
}

interface CartClientProps {
  products: CartProduct[];
}

const moneyFromCents = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  })
    .format(value / 100)
    .replace("THB", "฿");

const CartClient = ({ products }: CartClientProps) => {
  const [cartLines, setCartLines] = useState<CartLine[]>([]);

  const cartTotalCents = useMemo(
    () => cartLines.reduce((total, line) => total + line.priceCents * line.quantity, 0),
    [cartLines],
  );

  const addProduct = (product: CartProduct) => {
    setCartLines((current) => {
      const existing = current.find((line) => line.id === product.id);

      if (existing) {
        return current.map((line) =>
          line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  };

  const removeProduct = (productId: string) => {
    setCartLines((current) =>
      current
        .map((line) => (line.id === productId ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0),
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>สินค้าแบบซื้อเลย</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product, index) => (
            <div key={product.id} className="rounded-md border bg-background p-3">
              <div className={`product-art object-pos-${(index % 3) + 1} mb-3 aspect-[4/3] rounded-md bg-muted`} />
              <Badge variant="outline">{product.rarity}</Badge>
              <strong className="mt-2 block">{product.title}</strong>
              <span className="block text-sm text-muted-foreground">{product.seller}</span>
              <div className="mt-3 flex items-center justify-between gap-3">
                <strong className="text-primary">{moneyFromCents(product.priceCents)}</strong>
                <Button type="button" size="sm" onClick={() => addProduct(product)}>
                  <Plus data-icon="inline-start" />
                  ใส่ตะกร้า
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart />
            ตะกร้าสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {cartLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">เลือกสินค้าจากรายการด้านซ้ายเพื่อเริ่มทดสอบตะกร้า</p>
          ) : (
            cartLines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <strong className="block truncate">{line.title}</strong>
                  <span className="text-sm text-muted-foreground">{line.quantity} x {moneyFromCents(line.priceCents)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => removeProduct(line.id)} aria-label="ลดจำนวน">
                    <Minus />
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => addProduct(line)} aria-label="เพิ่มจำนวน">
                    <Plus />
                  </Button>
                </div>
              </div>
            ))
          )}
          <div className="rounded-md bg-muted p-4">
            <span className="text-sm text-muted-foreground">ยอดรวม</span>
            <strong className="block text-2xl">{moneyFromCents(cartTotalCents)}</strong>
          </div>
          <Button type="button" disabled={cartLines.length === 0}>
            ไปชำระเงิน
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export { CartClient };
