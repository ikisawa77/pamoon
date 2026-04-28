import { ChatPanel } from "@/components/shared/ChatPanel";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const ChatPage = async () => {
  const user = await getCurrentUser();
  const shopId = user?.shops[0]?.id;
  const threads = user
    ? await prisma.chatThread.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ buyerId: user.id }, ...(shopId ? [{ sellerShopId: shopId }] : [])],
        },
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        include: {
          buyer: { select: { displayName: true } },
          sellerShop: { select: { name: true } },
          product: { select: { title: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { displayName: true } } },
          },
          _count: {
            select: {
              messages: {
                where: {
                  readAt: null,
                  senderId: { not: user.id },
                },
              },
            },
          },
        },
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">แชท</h1>
        <p className="text-sm text-muted-foreground">
          แชทเปิดอัตโนมัติหลังผู้ซื้อชำระเงินหรือผู้ชนะประมูลชำระเงินแล้ว และจะถูกซ่อนหลังข้อความสุดท้าย 48 ชม.
        </p>
      </section>
      {user ? (
        <ChatPanel currentUserId={user.id} initialThreads={threads} />
      ) : (
        <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">กรุณาเข้าสู่ระบบก่อนดูแชท</div>
      )}
    </div>
  );
};

export default ChatPage;
