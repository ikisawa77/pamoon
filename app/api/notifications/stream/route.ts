import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const encodeEvent = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export const GET = async () => {
  const user = await getCurrentUser();

  if (!user) {
    return new Response(encodeEvent("notification", { unreadCount: 0, latestNotification: null }), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  }

  let lastSignature = "";
  let interval: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendUpdate = async () => {
        const [unreadCount, latestNotification] = await Promise.all([
          prisma.notification.count({ where: { recipientId: user.id, readAt: null } }),
          prisma.notification.findFirst({
            where: { recipientId: user.id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              title: true,
              message: true,
              href: true,
              readAt: true,
              createdAt: true,
            },
          }),
        ]);
        const signature = `${unreadCount}:${latestNotification?.id ?? "none"}:${latestNotification?.readAt?.toISOString() ?? "unread"}`;

        if (signature !== lastSignature) {
          lastSignature = signature;
          controller.enqueue(encodeEvent("notification", { unreadCount, latestNotification }));
        }
      };

      void sendUpdate();
      interval = setInterval(() => {
        void sendUpdate().catch(() => {
          controller.enqueue(encodeEvent("error", { message: "notification stream disconnected" }));
        });
      }, 3000);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
};
