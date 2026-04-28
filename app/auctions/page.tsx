import { ProductCatalogClient } from "@/components/shared/ProductCatalogClient";
import { getViewerSummary } from "@/lib/auth/viewer";
import { getMarketplaceSnapshot } from "@/lib/data/marketplace";

export const dynamic = "force-dynamic";

const AuctionsPage = async () => {
  const viewer = await getViewerSummary();
  const marketplace = await getMarketplaceSnapshot(viewer);

  return (
    <ProductCatalogClient
      initialData={marketplace}
      mode="auction"
      eyebrow="Live Auctions"
      title="ประมูลการ์ดใกล้หมดเวลา"
      subtitle="แสดงรายการประมูล 48 ใบต่อหน้า เรียงจากเวลาปิดประมูลเร็วที่สุด ค้นหาชื่อการ์ดได้จากทั้งสินค้าประมูลและซื้อเลย พร้อมตัวกรองชุด ระดับ และประเภทสินค้า"
    />
  );
};

export default AuctionsPage;
