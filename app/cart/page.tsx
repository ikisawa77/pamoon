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
    take: 120,
    include: {
      sellerShop: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  return (
    <StorefrontPageLayout
      title="ตะกร้าสินค้า"
      description="ตรวจรายการการ์ดที่เพิ่มไว้ แก้ไข ลบ หรือยืนยันคำสั่งซื้อก่อนเข้าสู่ขั้นตอนจัดส่ง"
    >
      <CartClient
        products={products.map((product) => ({
          id: product.id,
          title: product.title,
          seller: product.sellerShop.name,
          sellerSlug: product.sellerShop.slug,
          rarity: product.rarity,
          cardCode: product.cardCode,
          conditionLabel: product.conditionLabel,
          priceCents: product.currentPriceCents,
          imageUrl: product.imageUrl,
        }))}
      />
    </StorefrontPageLayout>
  );
};

export default CartPage;
