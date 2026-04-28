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
      title="ประมูลการ์ดใกล้จบและรายการใหม่"
      subtitle="เลือกดูการ์ดจากร้านค้าที่ผ่านการอนุมัติ เสนอราคาได้ทันที และเพิ่มรายการโปรดเพื่อรับอีเมลเมื่อมีคนประมูลทับหรือเหลือ 5 นาทีสุดท้าย"
    />
  );
};

export default AuctionsPage;
