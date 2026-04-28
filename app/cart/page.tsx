import { CartClient } from "@/components/shared/CartClient";
import { StorefrontPageLayout } from "@/components/shared/StorefrontPageLayout";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const CartPage = async () => {
  const products = await prisma.product.findMany({
    where: {
      mode: "BUY",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      sellerShop: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <StorefrontPageLayout title="ตะกร้าสินค้า" description="เลือกสินค้าซื้อเลยเข้าตะกร้าและดูยอดรวมทันที สำหรับทดสอบ flow ก่อนต่อระบบชำระเงินจริง">
      <CartClient
        products={products.map((product) => ({
          id: product.id,
          title: product.title,
          seller: product.sellerShop.name,
          rarity: product.rarity,
          priceCents: product.currentPriceCents,
        }))}
      />
    </StorefrontPageLayout>
  );
};

export default CartPage;
