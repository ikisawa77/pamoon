"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CART_STORAGE_KEY = "bidcard.cart";

const readCartCount = () => {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return 0;
    }

    return parsed.reduce((total, line) => {
      if (typeof line !== "object" || line === null) {
        return total;
      }

      const quantity = "quantity" in line && typeof line.quantity === "number" ? line.quantity : 1;
      return total + Math.max(1, Math.trunc(quantity));
    }, 0);
  } catch {
    return 0;
  }
};

const CartNavButton = ({ className, active = false }: { className?: string; active?: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const syncCount = () => setCount(readCartCount());

    syncCount();
    window.addEventListener("storage", syncCount);
    window.addEventListener("bidcard-cart-updated", syncCount);

    return () => {
      window.removeEventListener("storage", syncCount);
      window.removeEventListener("bidcard-cart-updated", syncCount);
    };
  }, []);

  return (
    <Button
      asChild
      variant={active ? "secondary" : "outline"}
      className={cn("relative shrink-0 gap-2 px-3", className)}
      aria-label="ตะกร้าสินค้า"
    >
      <Link href="/cart">
        <ShoppingCart className="size-4" />
        <span className="hidden sm:inline">ตะกร้า</span>
        {count > 0 ? (
          <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground shadow-lg shadow-primary/30">
            {count > 99 ? "99+" : count.toLocaleString("th-TH")}
          </span>
        ) : null}
      </Link>
    </Button>
  );
};

export { CartNavButton };

