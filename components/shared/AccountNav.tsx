"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  ClipboardList,
  Gavel,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  PackageCheck,
  Store,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { cn } from "@/lib/utils";

const accountMenuItems = [
  { label: "บัญชีของฉัน", href: "/account", icon: User },
  { label: "ที่อยู่จัดส่งสินค้า", href: "/account/addresses", icon: MapPin },
  { label: "รายการที่ถูกใจ", href: "/account/favorites", icon: Heart },
  { label: "การประมูลของฉัน", href: "/account/auctions", icon: Gavel },
  { label: "รายการตั้งรับ", href: "/account/wanted", icon: BellRing },
  { label: "รายการคำสั่งซื้อ", href: "/account/orders", icon: PackageCheck },
  { label: "แชท", href: "/account/chat", icon: MessageCircle },
  { label: "สมัครร้านค้า", href: "/account/seller", icon: Store },
];

const AccountNav = () => {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-3">
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <Button asChild variant="ghost" className="mb-2 w-full justify-start">
          <Link href="/">
            <Home data-icon="inline-start" />
            กลับหน้าแรก
          </Link>
        </Button>
        <nav className="flex flex-col gap-1">
          {accountMenuItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={cn("w-full justify-start", active && "text-primary")}
              >
                <Link href={item.href}>
                  <item.icon data-icon="inline-start" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ClipboardList />
          จัดการบัญชี
        </div>
        <LogoutButton className="w-full justify-start" />
      </div>
    </aside>
  );
};

export { AccountNav };
