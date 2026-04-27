import { AuctionMarketplace } from "@/components/shared/AuctionMarketplace";
import { initialMarketplace } from "@/lib/mock-data";

const HomePage = () => <AuctionMarketplace initialData={initialMarketplace} />;

export default HomePage;

