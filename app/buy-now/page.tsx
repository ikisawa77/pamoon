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
      title="ซื้อการ์ดพร้อมส่งจากร้านค้า"
      subtitle="รวมสินค้าลงขายล่าสุดพร้อมราคาแน่นอน กดซื้อผ่านกระเป๋าเงินของระบบและเปิดแชทกับร้านค้าหลังชำระเงินสำเร็จ"
    />
  );
};

export default BuyNowPage;
