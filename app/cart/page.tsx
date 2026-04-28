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
    <StorefrontPageLayout title="ตะกร้าสินค้า" description="ตรวจรายการการ์ดที่เพิ่มไว้ก่อนเข้าสู่ขั้นตอนชำระเงิน">
      <CartClient
        products={products.map((product) => ({
          id: product.id,
          title: product.title,
          seller: product.sellerShop.name,
          rarity: product.rarity,
          priceCents: product.currentPriceCents,
          imageUrl: product.imageUrl,
        }))}
      />
    </StorefrontPageLayout>
  );
};

export default CartPage;
