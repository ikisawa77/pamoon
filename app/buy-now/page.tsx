import { ProductCatalogClient } from "@/components/shared/ProductCatalogClient";
import { getViewerSummary } from "@/lib/auth/viewer";
import { getMarketplaceSnapshot } from "@/lib/data/marketplace";

export const dynamic = "force-dynamic";

const BuyNowPage = async () => {
  const viewer = await getViewerSummary();
  const marketplace = await getMarketplaceSnapshot(viewer);

  return (
    <ProductCatalogClient
      initialData={marketplace}
      mode="buy"
      eyebrow="Buy Now"
      title="ซื้อการ์ดพร้อมส่ง"
      subtitle="รวมการ์ดที่ตั้งขายทั้งหมด คลิกการ์ดเพื่อดูรายละเอียด รหัสการ์ด ชุด สภาพสินค้า และเพิ่มลงตะกร้าก่อนชำระเงิน"
    />
  );
};

export default BuyNowPage;
