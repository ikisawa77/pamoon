"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnreadCountResponse {
  ok: boolean;
  unreadCount: number;
}

interface NotificationBellProps {
  className?: string;
}

const NotificationBell = ({ className }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        const result = (await response.json()) as UnreadCountResponse;

        if (mounted && response.ok && result.ok) {
          setUnreadCount(result.unreadCount);
        }
      } catch {
        if (mounted) {
          setUnreadCount(0);
        }
      }
    };

    void loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 8000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Button asChild variant="ghost" size="icon" className={className} aria-label="แจ้งเตือน">
      <Link href="/notifications" className="relative">
        <Bell />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
};

export { NotificationBell };
