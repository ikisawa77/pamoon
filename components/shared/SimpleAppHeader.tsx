"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogIn,
  Store,
  Trophy,
  UserCircle,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartNavButton } from "@/components/shared/CartNavButton";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { label: "ประมูล", href: "/auctions", icon: Trophy },
  { label: "ซื้อเลย", href: "/buy-now", icon: CreditCard },
  { label: "Reseller", href: "/shops", icon: Store },
  { label: "ช่วยเหลือ", href: "/help", icon: CircleHelp },
];

const privateNavItems = [{ label: "รายการโปรด", href: "/collection", icon: Heart }];

interface HeaderUser {
  displayName: string;
  role: string;
}

interface SimpleAppHeaderProps {
  user?: HeaderUser | null;
}

const roleLabel = (role: string) => {
  if (role === "ADMIN") return "ผู้ดูแลระบบ";
  if (role === "RESELLER") return "Reseller";
  if (role === "GUEST") return "ผู้เยี่ยมชม";
  return "สมาชิก";
};

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const AuthButtons = ({ pathname }: { pathname: string }) => (
  <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-white/15 bg-white/[0.03] shadow-sm">
    <Link
      href="/login"
      className={cn(
        "inline-flex h-10 items-center gap-2 whitespace-nowrap px-3 text-sm font-medium transition hover:bg-white/10",
        isActivePath(pathname, "/login") ? "bg-secondary text-foreground" : "text-muted-foreground",
      )}
    >
      <LogIn className="size-4" />
      เข้าสู่ระบบ
    </Link>
    <Link
      href="/register"
      className={cn(
        "inline-flex h-10 items-center gap-2 whitespace-nowrap bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90",
        isActivePath(pathname, "/register") && "ring-2 ring-primary/40",
      )}
    >
      <UserPlus className="size-4" />
      สมัคร
    </Link>
  </div>
);

const SimpleAppHeader = ({ user }: SimpleAppHeaderProps) => {
  const pathname = usePathname();
  const signedInUser = user && user.role !== "GUEST" ? user : null;
  const navItems = signedInUser ? [...publicNavItems.slice(0, 3), ...privateNavItems, publicNavItems[3]] : publicNavItems;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060914]/90 px-4 py-3 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <Link href="/" className="flex min-w-fit items-center gap-2">
          <div className="flex size-10 rotate-[-8deg] items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
            *
          </div>
          <div className="whitespace-nowrap text-2xl font-bold tracking-tight">
            <span>BidCard</span> <span className="text-primary">TH</span>
          </div>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                className={cn("shrink-0 px-3", active ? "text-foreground" : "text-muted-foreground")}
              >
                <Link href={item.href}>
                  <item.icon data-icon="inline-start" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-fit items-center justify-end gap-2">
          {signedInUser ? (
            <>
              {signedInUser.role === "ADMIN" ? (
                <Button asChild variant={isActivePath(pathname, "/admin") ? "secondary" : "outline"} className="shrink-0">
                  <Link href="/admin">
                    <LayoutDashboard data-icon="inline-start" />
                    <span className="hidden lg:inline">หลังบ้าน</span>
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant={isActivePath(pathname, "/account") ? "secondary" : "outline"} className="max-w-[190px] shrink-0">
                <Link href="/account">
                  <UserCircle data-icon="inline-start" />
                  <span className="min-w-0 truncate">{signedInUser.displayName}</span>
                  <span className="hidden text-xs text-muted-foreground xl:inline">{roleLabel(signedInUser.role)}</span>
                </Link>
              </Button>
              <Button asChild variant={isActivePath(pathname, "/wallet") ? "secondary" : "outline"} className="shrink-0">
                <Link href="/wallet">
                  <Wallet data-icon="inline-start" />
                  <span className="hidden lg:inline">กระเป๋าเงิน</span>
                </Link>
              </Button>
              <NotificationBell className="shrink-0" />
            </>
          ) : (
            <AuthButtons pathname={pathname} />
          )}
          <CartNavButton active={isActivePath(pathname, "/cart")} className="shrink-0" />
        </div>
      </div>
    </header>
  );
};

export { SimpleAppHeader };
