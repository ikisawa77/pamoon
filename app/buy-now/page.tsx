import { AuctionMarketplace } from "@/components/shared/AuctionMarketplace";
import { getMarketplaceSnapshot } from "@/lib/data/marketplace";

const BuyNowPage = async () => {
  const marketplace = await getMarketplaceSnapshot();

  return <AuctionMarketplace initialData={marketplace} initialSaleType="buy" />;
};

export default BuyNowPage;
