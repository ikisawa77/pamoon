import { AuctionMarketplace } from "@/components/shared/AuctionMarketplace";
import { getMarketplaceSnapshot } from "@/lib/data/marketplace";

const AuctionsPage = async () => {
  const marketplace = await getMarketplaceSnapshot();

  return <AuctionMarketplace initialData={marketplace} initialSaleType="auction" />;
};

export default AuctionsPage;
