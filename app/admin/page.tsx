import { redirect } from "next/navigation";
import { AppFooter } from "@/components/shared/AppFooter";
import { AdminDashboardClient } from "@/components/shared/AdminDashboardClient";
import { SimpleAppHeader } from "@/components/shared/SimpleAppHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const AdminPage = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    userCount,
    shopCount,
    productCount,
    auctionCount,
    orderCount,
    walletCount,
    homeContents,
    cardSets,
    products,
    orders,
    shops,
    users,
    notifications,
    emails,
    emailTemplates,
    moderationCases,
    auditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shop.count(),
    prisma.product.count(),
    prisma.product.count({ where: { mode: "AUCTION" } }),
    prisma.order.count(),
    prisma.walletTransaction.count(),
    prisma.homeContent.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }),
    prisma.cardSet.findMany({
      orderBy: [{ sortOrder: "asc" }, { setCode: "asc" }],
      include: {
        game: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 120,
      include: {
        sellerShop: { select: { name: true } },
        _count: { select: { bids: true, favorites: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      include: {
        buyer: { select: { email: true } },
        sellerShop: { select: { name: true } },
        product: { select: { title: true } },
      },
    }),
    prisma.shop.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 60,
      include: {
        owner: { select: { email: true, displayName: true, role: true } },
        _count: { select: { products: true, orders: true, moderationCases: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      include: {
        _count: { select: { orders: true, bids: true } },
      },
    }),
    prisma.notification.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 80,
      include: { recipient: { select: { email: true } } },
    }),
    prisma.emailNotification.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 80,
    }),
    prisma.emailTemplate.findMany({
      orderBy: [{ type: "asc" }],
    }),
    prisma.moderationCase.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 60,
      include: {
        user: { select: { email: true } },
        shop: { select: { name: true } },
        order: { include: { product: { select: { title: true } } } },
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 60,
    }),
  ]);

  const productCountsBySet = new Map<string, { productCount: number; auctionCount: number; buyCount: number }>();
  for (const product of products) {
    const key = product.category;
    const current = productCountsBySet.get(key) ?? { productCount: 0, auctionCount: 0, buyCount: 0 };
    current.productCount += 1;
    if (product.mode === "AUCTION") current.auctionCount += 1;
    if (product.mode === "BUY") current.buyCount += 1;
    productCountsBySet.set(key, current);
  }

  const stats = [
    { label: "สมาชิก", value: userCount.toLocaleString("th-TH"), detail: "บัญชีทั้งหมดในระบบ" },
    { label: "ร้านค้า", value: shopCount.toLocaleString("th-TH"), detail: "ร้านที่สมัครและร้านสำหรับทดสอบ" },
    { label: "สินค้า", value: productCount.toLocaleString("th-TH"), detail: "รวมประมูลและซื้อเลย" },
    { label: "ประมูล", value: auctionCount.toLocaleString("th-TH"), detail: "รายการประมูลทั้งหมด" },
    { label: "คำสั่งซื้อ", value: orderCount.toLocaleString("th-TH"), detail: "Order ที่สร้างในระบบ" },
    { label: "ธุรกรรมเงิน", value: walletCount.toLocaleString("th-TH"), detail: "Wallet transaction ทั้งหมด" },
  ];

  return (
    <div className="retro-shell min-h-screen text-foreground">
      <SimpleAppHeader user={user} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <AdminDashboardClient
          stats={stats}
          homeContents={homeContents.map((content) => ({
            id: content.id,
            type: content.type,
            title: content.title,
            subtitle: content.subtitle,
            body: content.body,
            href: content.href,
            imageUrl: content.imageUrl,
            badge: content.badge,
            sortOrder: content.sortOrder,
            isActive: content.isActive,
          }))}
          cardSets={cardSets.map((set) => {
            const counts = productCountsBySet.get(set.category) ?? { productCount: 0, auctionCount: 0, buyCount: 0 };
            return {
              id: set.id,
              gameName: set.game.name,
              category: set.category,
              setCode: set.setCode,
              setName: set.setName,
              label: set.label,
              isActive: set.isActive,
              sortOrder: set.sortOrder,
              ...counts,
            };
          })}
          products={products.map((product) => ({
            id: product.id,
            title: product.title,
            cardCode: product.cardCode,
            setName: product.setName,
            seller: product.sellerShop.name,
            mode: product.mode,
            status: product.status,
            rarity: product.rarity,
            currentPriceCents: product.currentPriceCents,
            auctionEndsAt: product.auctionEndsAt?.toISOString() ?? null,
            bidCount: product._count.bids,
            favoriteCount: product._count.favorites,
          }))}
          orders={orders.map((order) => ({
            id: order.id,
            productTitle: order.product.title,
            buyerEmail: order.buyer.email,
            seller: order.sellerShop.name,
            source: order.source,
            status: order.status,
            amountCents: order.amountCents,
            paymentDueAt: order.paymentDueAt?.toISOString() ?? null,
            shipDueAt: order.shipDueAt?.toISOString() ?? null,
            refundDueAt: order.refundDueAt?.toISOString() ?? null,
            trackingNumber: order.trackingNumber,
          }))}
          shops={shops.map((shop) => ({
            id: shop.id,
            name: shop.name,
            ownerEmail: shop.owner.email,
            ownerName: shop.owner.displayName,
            ownerRole: shop.owner.role,
            status: shop.status,
            description: shop.description,
            hasPhysicalStore: shop.hasPhysicalStore,
            logoUrl: shop.logoUrl,
            applicantName: [shop.applicantFirstName, shop.applicantLastName].filter(Boolean).join(" ") || null,
            contactEmail: shop.contactEmail,
            phone: shop.phone,
            phoneVerifiedAt: shop.phoneVerifiedAt?.toISOString() ?? null,
            bankName: shop.bankName,
            bankBranch: shop.bankBranch,
            bankAccountName: shop.bankAccountName,
            bankAccountNumber: shop.bankAccountNumber,
            bankBookImageUrl: shop.bankBookImageUrl,
            address: [shop.addressLine, shop.subdistrict, shop.district, shop.province, shop.postalCode].filter(Boolean).join(" "),
            rejectionReason: shop.rejectionReason,
            reviewedAt: shop.reviewedAt?.toISOString() ?? null,
            productCount: shop._count.products,
            orderCount: shop._count.orders,
            moderationCount: shop._count.moderationCases,
          }))}
          users={users.map((account) => ({
            id: account.id,
            email: account.email,
            displayName: account.displayName,
            role: account.role,
            status: account.status,
            walletBalanceCents: account.walletBalanceCents,
            bidLimitCents: account.bidLimitCents,
            orderCount: account._count.orders,
            bidCount: account._count.bids,
          }))}
          notifications={notifications.map((notification) => ({
            id: notification.id,
            recipient: notification.recipient.email,
            type: notification.type,
            title: notification.title,
            href: notification.href,
            readAt: notification.readAt?.toISOString() ?? null,
            createdAt: notification.createdAt.toISOString(),
          }))}
          emails={emails.map((email) => ({
            id: email.id,
            toEmail: email.toEmail,
            subject: email.subject,
            status: email.status,
            reason: email.reason,
            createdAt: email.createdAt.toISOString(),
          }))}
          emailTemplates={emailTemplates.map((template) => ({
            id: template.id,
            type: template.type,
            name: template.name,
            subject: template.subject,
            preheader: template.preheader,
            headline: template.headline,
            body: template.body,
            accentColor: template.accentColor,
            ctaLabel: template.ctaLabel,
            isActive: template.isActive,
          }))}
          moderationCases={moderationCases.map((moderationCase) => ({
            id: moderationCase.id,
            type: moderationCase.type,
            status: moderationCase.status,
            reason: moderationCase.reason,
            user: moderationCase.user?.email ?? null,
            shop: moderationCase.shop?.name ?? null,
            orderProduct: moderationCase.order?.product.title ?? null,
            createdAt: moderationCase.createdAt.toISOString(),
          }))}
          auditLogs={auditLogs.map((log) => ({
            id: log.id,
            action: log.action,
            targetType: log.targetType,
            message: log.message,
            createdAt: log.createdAt.toISOString(),
          }))}
        />
      </main>
      <AppFooter />
    </div>
  );
};

export default AdminPage;
