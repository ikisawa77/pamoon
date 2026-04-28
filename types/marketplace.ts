export type ListingMode = "auction" | "buy";

export type ProductCategory = "op01" | "op02" | "op03" | "op04" | "op05";

export type ProductRarity = "C" | "UC" | "R" | "L" | "SR" | "SEC" | "SP" | "P";

export interface AuctionProduct {
  id: string;
  title: string;
  code: string;
  seller: string;
  shopId: string;
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

export type ViewerRole = "GUEST" | "MEMBER" | "SHOP" | "ADMIN";

export interface ViewerSummary {
  id?: string;
  email?: string;
  displayName: string;
  role: ViewerRole;
  status?: string;
  shopId?: string;
  shopStatus?: string;
}

export interface MarketplaceSnapshot {
  wallet: WalletSummary;
  products: AuctionProduct[];
  activities: ActivityItem[];
  viewer: ViewerSummary;
  currentUserId?: string;
  primaryShopId?: string;
}
