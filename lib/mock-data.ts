import type {
  AuctionProduct,
  ListingMode,
  MarketplaceSnapshot,
  ProductCategory,
  ProductRarity,
} from "@/types/marketplace";

interface ShopSeed {
  id: string;
  name: string;
  bidderPrefix: string;
}

const shops: ShopSeed[] = [
  { id: "cardhunter", name: "CardHunter Shop", bidderPrefix: "Hunter" },
  { id: "grandline", name: "Grand Line Cards", bidderPrefix: "StrawHat" },
  { id: "romance", name: "Romance Dawn Vault", bidderPrefix: "Dawn" },
];

const rarities: ProductRarity[] = ["C", "UC", "R", "L", "SR", "SEC", "SP", "P"];

const sets: Array<{ category: ProductCategory; code: string; name: string }> = [
  { category: "op01", code: "OP-01", name: "ROMANCE DAWN" },
  { category: "op02", code: "OP-02", name: "PARAMOUNT WAR" },
  { category: "op03", code: "OP-03", name: "PILLARS OF STRENGTH" },
  { category: "op04", code: "OP-04", name: "KINGDOMS OF INTRIGUE" },
  { category: "op05", code: "OP-05", name: "AWAKENING OF THE NEW ERA" },
];

const cardNames = [
  "Monkey D. Luffy",
  "Roronoa Zoro",
  "Nami",
  "Usopp",
  "Sanji",
  "Tony Tony Chopper",
  "Nico Robin",
  "Franky",
  "Brook",
  "Jinbe",
  "Shanks",
  "Trafalgar Law",
  "Eustass Kid",
  "Yamato",
  "Boa Hancock",
  "Portgas D. Ace",
  "Sabo",
  "Edward Newgate",
  "Kaido",
  "Charlotte Linlin",
  "Donquixote Doflamingo",
  "Crocodile",
  "Dracule Mihawk",
  "Buggy",
  "Rob Lucci",
  "Kaku",
  "Enel",
  "Perona",
  "Marco",
  "Kuzan",
  "Borsalino",
  "Sakazuki",
  "Rebecca",
  "Vinsmoke Reiju",
  "Carrot",
  "Tashigi",
  "Smoker",
  "Gecko Moria",
  "Silvers Rayleigh",
  "Gol D. Roger",
];

const rarityPriceBase: Record<ProductRarity, number> = {
  C: 80,
  UC: 150,
  R: 320,
  L: 750,
  SR: 1600,
  SEC: 3600,
  SP: 6200,
  P: 9800,
};

const imagePositions = [
  "object-pos-1",
  "object-pos-2",
  "object-pos-3",
  "object-pos-4",
  "object-pos-5",
  "object-pos-6",
];

const makeCardCode = (setCode: string, index: number, rarity: ProductRarity) =>
  `${setCode}-${String((index % 121) + 1).padStart(3, "0")} ${rarity}`;

const makeProduct = (index: number, mode: ListingMode): AuctionProduct => {
  const rarity = rarities[index % rarities.length];
  const set = sets[index % sets.length];
  const shop = shops[index % shops.length];
  const basePrice = rarityPriceBase[rarity] + index * 37 + (mode === "auction" ? 250 : 520);
  const currentPrice = Math.round(basePrice / 10) * 10;
  const openingPrice = Math.max(50, Math.round((currentPrice * 0.72) / 10) * 10);
  const nextBid = Math.round((currentPrice + Math.max(100, currentPrice * 0.05)) / 10) * 10;
  const minutes = 3 + (index * 7) % 57;

  return {
    id: `${mode}-${String(index + 1).padStart(2, "0")}`,
    title: `${cardNames[index % cardNames.length]} (${rarity})`,
    code: `${makeCardCode(set.code.replace("-", ""), index, rarity)} · ${set.name}`,
    seller: shop.name,
    shopId: shop.id,
    topBidder: mode === "auction" ? `${shop.bidderPrefix}${String(index + 11).padStart(2, "0")}` : "พร้อมส่ง",
    mode,
    category: set.category,
    rarity,
    openingPrice,
    currentPrice,
    nextBid,
    watchers: 12 + (index * 11) % 139,
    endsIn: mode === "auction" ? `00:${String(minutes).padStart(2, "0")}:${String((index * 13) % 60).padStart(2, "0")}` : "พร้อมส่ง",
    imagePositionClass: imagePositions[index % imagePositions.length],
    hot: index >= 40,
  };
};

const auctionProducts = Array.from({ length: 80 }, (_, index) => makeProduct(index, "auction"));
const buyNowProducts = Array.from({ length: 80 }, (_, index) => makeProduct(index, "buy"));

export const initialMarketplace: MarketplaceSnapshot = {
  wallet: {
    balance: 2450,
    pendingPayment: 320,
    bidLimit: 10000,
  },
  activities: [
    { id: "act-1", title: "สร้างข้อมูลตัวอย่าง", detail: "3 ร้านค้า / ซื้อเลย 80 ใบ / ประมูล 80 ใบ" },
    { id: "act-2", title: "ครอบคลุม RARITY", detail: "C, UC, R, L, SR, SEC, SP, P" },
    { id: "act-3", title: "อิง filter", detail: "SET, RARITY, NAME, CARD ID, RANGE" },
  ],
  products: [...auctionProducts, ...buyNowProducts],
};

export const mockShopNames = shops.map((shop) => shop.name);
export const mockRarities = rarities;
