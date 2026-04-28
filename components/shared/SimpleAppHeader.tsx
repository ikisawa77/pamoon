import Link from "next/link";
import { Bell, BookOpen, CircleHelp, CreditCard, ShoppingCart, Store, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "ประมูล", href: "/auctions", icon: Trophy },
  { label: "ซื้อเลย", href: "/buy-now", icon: CreditCard },
  { label: "ตลาดร้านค้า", href: "/shops", icon: Store },
  { label: "คอลเลกชัน", href: "/collection", icon: BookOpen },
  { label: "ช่วยเหลือ", href: "/help", icon: CircleHelp },
];

const SimpleAppHeader = () => (
  <header className="sticky top-0 z-40 border-b bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
    <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          ★
        </div>
        <div className="text-2xl font-bold tracking-tight">
          <span>BidCard</span> <span className="text-primary">TH</span>
        </div>
      </Link>

      <nav className="flex gap-2 overflow-x-auto md:justify-center">
        {navItems.map((item) => (
          <Button key={item.href} asChild variant="ghost" className="shrink-0 text-muted-foreground">
            <Link href={item.href}>
              <item.icon data-icon="inline-start" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="flex items-center gap-2 overflow-x-auto md:justify-end">
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/wallet">
            <Wallet data-icon="inline-start" />
            กระเป๋าเงิน
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="แจ้งเตือน">
          <Link href="/notifications">
            <Bell />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="ตะกร้า">
          <Link href="/cart">
            <ShoppingCart />
          </Link>
        </Button>
      </div>
    </div>
  </header>
);

export { SimpleAppHeader };
