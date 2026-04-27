import { AuctionMarketplace } from "@/components/shared/AuctionMarketplace";
import { getMarketplaceSnapshot } from "@/lib/data/marketplace";

const HomePage = async () => {
  const marketplace = await getMarketplaceSnapshot();

  return <AuctionMarketplace initialData={marketplace} />;
};

export default HomePage;
