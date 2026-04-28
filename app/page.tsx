import { AuctionMarketplace } from "@/components/shared/AuctionMarketplace";
import { getViewerSummary } from "@/lib/auth/viewer";
import { getMarketplaceSnapshot } from "@/lib/data/marketplace";

const HomePage = async () => {
  const viewer = await getViewerSummary();
  const marketplace = await getMarketplaceSnapshot(viewer);

  return <AuctionMarketplace initialData={marketplace} />;
};

export default HomePage;
