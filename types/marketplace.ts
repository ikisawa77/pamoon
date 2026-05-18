export type ListingMode = "auction" | "buy";

export type ProductCategory =
  | "op01"
  | "op02"
  | "op03"
  | "op04"
  | "op05"
  | "op06"
  | "op07"
  | "op08"
  | "op09"
  | "op10"
  | "op11"
  | "op12"
  | "op13"
  | "op14"
  | "op15"
  | "eb01"
  | "eb02"
  | "eb03"
  | "eb04"
  | "prb01"
  | "prb02"
  | "st01"
  | "st02"
  | "st03"
  | "st04"
  | "st05"
  | "st06"
  | "st07"
  | "st08"
  | "st09"
  | "st10"
  | "st11"
  | "st12"
  | "st13"
  | "st14"
  | "st15"
  | "st16"
  | "st17"
  | "st18"
  | "st19"
  | "st20"
  | "st21"
  | "st22"
  | "st23"
  | "st24"
  | "st25"
  | "st26"
  | "st27"
  | "st28"
  | "st29"
  | "st30";

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
  auctionEndsAt: string | null;
  imageUrl: string | null;
  imagePositionClass: string;
  hot: boolean;
  isFavorite?: boolean;
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

export type ViewerRole = "GUEST" | "MEMBER" | "RESELLER" | "ADMIN";

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
