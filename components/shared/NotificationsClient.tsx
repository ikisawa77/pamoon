"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, MessageCircle, PackageCheck, ShieldAlert, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
  actor: {
    displayName: string;
    role: string;
  } | null;
  product: {
    title: string;
  } | null;
}

interface NotificationsResponse {
  ok: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}

type NotificationCategory = "all" | "orders" | "auctions" | "chat" | "system" | "action";

const notificationTypeLabel: Record<string, string> = {
  ORDER_CREATED: "คำสั่งซื้อ",
  ORDER_PAID: "ชำระเงิน",
  ORDER_SHIPPED: "จัดส่ง",
  BID_PLACED: "เสนอราคา",
  BID_OUTBID: "ถูกเสนอสูงกว่า",
  BID_WINNING: "กำลังชนะ",
  AUCTION_WON: "ชนะประมูล",
  PAYMENT_DUE: "รอชำระ",
  PAYMENT_OVERDUE: "เลยกำหนดชำระ",
  SHIPPING_DUE: "ต้องจัดส่ง",
  SHIPPING_EXTENDED: "ขยายเวลาส่ง",
  SHIPPING_OVERDUE: "เลยกำหนดส่ง",
  REFUND_CREATED: "คืนเงิน",
  ACCOUNT_SUSPENDED: "ระงับบัญชี",
  CHAT_MESSAGE: "แชท",
  SHOP_MESSAGE: "แชท",
  SYSTEM: "ระบบ",
};

const categories: Array<{ value: NotificationCategory; label: string; icon: typeof Bell }> = [
  { value: "all", label: "ทั้งหมด", icon: Bell },
  { value: "orders", label: "คำสั่งซื้อ", icon: PackageCheck },
  { value: "auctions", label: "ประมูล", icon: Trophy },
  { value: "chat", label: "แชท", icon: MessageCircle },
  { value: "system", label: "ระบบ", icon: ShieldAlert },
  { value: "action", label: "ต้องทำตอนนี้", icon: ShieldAlert },
];

const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const NotificationsClient = ({ initialNotifications, initialUnreadCount }: NotificationsClientProps) => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [status, setStatus] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<NotificationCategory>("all");

  const loadNotifications = useCallback(async () => {
    const response = await fetch(`/api/notifications?status=${status}&category=${category}&limit=80`, {
      cache: "no-store",
    });
    const result = (await response.json()) as NotificationsResponse;

    if (response.ok && result.ok) {
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    }
  }, [category, status]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) {
      return;
    }

    const eventSource = new EventSource("/api/notifications/stream");
    eventSource.addEventListener("notification", () => {
      void loadNotifications();
    });

    return () => {
      eventSource.close();
    };
  }, [loadNotifications]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => status === "all" || !notification.readAt),
    [status, notifications],
  );

  const markOneRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, readAt: new Date().toISOString() } : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell />
            ตัวกรอง
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {categories.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={category === item.value ? "secondary" : "ghost"}
                className="justify-start"
                onClick={() => setCategory(item.value)}
              >
                <item.icon data-icon="inline-start" />
                {item.label}
              </Button>
            ))}
          </div>
          <div className="my-2 border-t" />
          <Button type="button" variant={status === "all" ? "secondary" : "ghost"} onClick={() => setStatus("all")}>
            ทั้งหมด
          </Button>
          <Button type="button" variant={status === "unread" ? "secondary" : "ghost"} onClick={() => setStatus("unread")}>
            ยังไม่อ่าน ({unreadCount})
          </Button>
          <Button type="button" variant="outline" disabled={unreadCount === 0} onClick={markAllRead}>
            <CheckCheck data-icon="inline-start" />
            อ่านทั้งหมด
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>แจ้งเตือนล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {visibleNotifications.length === 0 ? (
            <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
              ยังไม่มีแจ้งเตือนในหมวดนี้
            </div>
          ) : (
            visibleNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "grid gap-3 rounded-md border bg-background p-4 md:grid-cols-[1fr_auto] md:items-start",
                  !notification.readAt && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={notification.readAt ? "outline" : "default"}>
                      {notificationTypeLabel[notification.type] ?? notification.type}
                    </Badge>
                    {!notification.readAt ? <Badge variant="secondary">ใหม่</Badge> : null}
                    <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
                  </div>
                  <strong className="mt-2 block">{notification.title}</strong>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  {notification.actor ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      จาก {notification.actor.displayName} ({notification.actor.role})
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {notification.href ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={notification.href}>เปิดดู</Link>
                    </Button>
                  ) : null}
                  {!notification.readAt ? (
                    <Button type="button" size="sm" onClick={() => markOneRead(notification.id)}>
                      อ่านแล้ว
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { NotificationsClient };
