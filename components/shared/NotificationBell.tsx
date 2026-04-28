"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnreadCountResponse {
  ok: boolean;
  unreadCount: number;
}

interface StreamNotification {
  unreadCount: number;
  latestNotification: {
    id: string;
    title: string;
    message: string;
  } | null;
}

interface NotificationBellProps {
  className?: string;
}

const NotificationBell = ({ className }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestTitle, setLatestTitle] = useState("แจ้งเตือน");

  useEffect(() => {
    let mounted = true;
    let fallbackInterval: number | undefined;

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

    const startFallback = () => {
      void loadUnreadCount();
      fallbackInterval = window.setInterval(loadUnreadCount, 8000);
    };

    if (typeof window === "undefined" || !("EventSource" in window)) {
      startFallback();
      return () => {
        mounted = false;
        if (fallbackInterval) {
          window.clearInterval(fallbackInterval);
        }
      };
    }

    const eventSource = new EventSource("/api/notifications/stream");
    eventSource.addEventListener("notification", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as StreamNotification;

      if (!mounted) {
        return;
      }

      setUnreadCount(payload.unreadCount);

      if (payload.latestNotification) {
        setLatestTitle(payload.latestNotification.title);
      }
    });
    eventSource.onerror = () => {
      eventSource.close();

      if (!fallbackInterval) {
        startFallback();
      }
    };

    return () => {
      mounted = false;
      eventSource.close();

      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
      }
    };
  }, []);

  return (
    <Button asChild variant="ghost" size="icon" className={className} aria-label="แจ้งเตือน" title={latestTitle}>
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
