export type ListingMode = "auction" | "buy";

export type ProductCategory = "pokemon" | "sealed" | "single" | "onepiece";

export type ProductRarity = "SEC" | "UR" | "SR" | "R" | "C" | "SAR" | "SP" | "HR";

export interface AuctionProduct {
  id: string;
  title: string;
  code: string;
  seller: string;
  topBidder: string;
  mode: ListingMode;
  category: ProductCategory;
  rarity: ProductRarity;
  openingPrice: number;
  currentPrice: number;
  nextBid: number;
  watchers: number;
  endsIn: string;
  imagePositionClass: string;
  hot: boolean;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
}

export interface WalletSummary {
  balance: number;
  pendingPayment: number;
  bidLimit: number;
}

export interface MarketplaceSnapshot {
  wallet: WalletSummary;
  products: AuctionProduct[];
  activities: ActivityItem[];
}

