import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { NotificationsClient } from "@/components/shared/NotificationsClient";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const NotificationsPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <StorefrontPageLayout title="แจ้งเตือน" description="เข้าสู่ระบบเพื่อดูแจ้งเตือนการสั่งซื้อ การประมูล และข้อความจากร้านค้า">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
            <Bell />
            <strong className="text-foreground">ยังไม่ได้เข้าสู่ระบบ</strong>
            <span>เมื่อเข้าสู่ระบบแล้ว ระบบจะแสดงแจ้งเตือนแบบ realtime จากการสั่งซื้อและการประมูลของคุณ</span>
          </CardContent>
        </Card>
      </StorefrontPageLayout>
    );
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        actor: {
          select: {
            displayName: true,
            role: true,
          },
        },
        product: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.notification.count({
      where: {
        recipientId: user.id,
        readAt: null,
      },
    }),
  ]);

  return (
    <StorefrontPageLayout title="แจ้งเตือน" description="ระบบแจ้งเตือนการสั่งซื้อ การประมูล และการสื่อสารระหว่างสมาชิกกับร้านค้า">
      <NotificationsClient initialNotifications={notifications} initialUnreadCount={unreadCount} />
    </StorefrontPageLayout>
  );
};

export default NotificationsPage;
