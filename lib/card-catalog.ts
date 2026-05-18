import type { ProductCategory } from "@/types/marketplace";

export const CARD_GAME_NAME = "One Piece Card Game (Japanese)";

export const productCategoryValues = [
  "op01",
  "op02",
  "op03",
  "op04",
  "op05",
  "op06",
  "op07",
  "op08",
  "op09",
  "op10",
  "op11",
  "op12",
  "op13",
  "op14",
  "op15",
  "eb01",
  "eb02",
  "eb03",
  "eb04",
  "prb01",
  "prb02",
  "st01",
  "st02",
  "st03",
  "st04",
  "st05",
  "st06",
  "st07",
  "st08",
  "st09",
  "st10",
  "st11",
  "st12",
  "st13",
  "st14",
  "st15",
  "st16",
  "st17",
  "st18",
  "st19",
  "st20",
  "st21",
  "st22",
  "st23",
  "st24",
  "st25",
  "st26",
  "st27",
  "st28",
  "st29",
  "st30",
] as const satisfies readonly ProductCategory[];

export const productCategoryEnumValues = [
  "OP01",
  "OP02",
  "OP03",
  "OP04",
  "OP05",
  "OP06",
  "OP07",
  "OP08",
  "OP09",
  "OP10",
  "OP11",
  "OP12",
  "OP13",
  "OP14",
  "OP15",
  "EB01",
  "EB02",
  "EB03",
  "EB04",
  "PRB01",
  "PRB02",
  "ST01",
  "ST02",
  "ST03",
  "ST04",
  "ST05",
  "ST06",
  "ST07",
  "ST08",
  "ST09",
  "ST10",
  "ST11",
  "ST12",
  "ST13",
  "ST14",
  "ST15",
  "ST16",
  "ST17",
  "ST18",
  "ST19",
  "ST20",
  "ST21",
  "ST22",
  "ST23",
  "ST24",
  "ST25",
  "ST26",
  "ST27",
  "ST28",
  "ST29",
  "ST30",
] as const satisfies readonly Uppercase<ProductCategory>[];

export interface CardSetDefinition {
  category: ProductCategory;
  setCode: string;
  setName: string;
  label: string;
}

const makeStarterDeck = (index: number): CardSetDefinition => {
  const code = `ST-${String(index).padStart(2, "0")}`;
  const category = `st${String(index).padStart(2, "0")}` as ProductCategory;

  return {
    category,
    setCode: code,
    setName: `Starter Deck ${String(index).padStart(2, "0")}`,
    label: `[${code}] Starter Deck ${String(index).padStart(2, "0")}`,
  };
};

export const cardSetDefinitions: CardSetDefinition[] = [
  { category: "op01", setCode: "OP-01", setName: "Romance Dawn", label: "[OP-01] Romance Dawn" },
  { category: "op02", setCode: "OP-02", setName: "Paramount War", label: "[OP-02] Paramount War" },
  { category: "op03", setCode: "OP-03", setName: "Pillars of Strength", label: "[OP-03] Pillars of Strength" },
  { category: "op04", setCode: "OP-04", setName: "Kingdoms of Intrigue", label: "[OP-04] Kingdoms of Intrigue" },
  { category: "op05", setCode: "OP-05", setName: "Awakening of the New Era", label: "[OP-05] Awakening of the New Era" },
  { category: "op06", setCode: "OP-06", setName: "Wings of the Captain", label: "[OP-06] Wings of the Captain" },
  { category: "op07", setCode: "OP-07", setName: "500 Years in the Future", label: "[OP-07] 500 Years in the Future" },
  { category: "op08", setCode: "OP-08", setName: "Two Legends", label: "[OP-08] Two Legends" },
  { category: "op09", setCode: "OP-09", setName: "Emperors in the New World", label: "[OP-09] Emperors in the New World" },
  { category: "op10", setCode: "OP-10", setName: "Royal Blood", label: "[OP-10] Royal Blood" },
  { category: "op11", setCode: "OP-11", setName: "A Fist of Divine Speed", label: "[OP-11] A Fist of Divine Speed" },
  { category: "op12", setCode: "OP-12", setName: "Legacy of the Master", label: "[OP-12] Legacy of the Master" },
  { category: "op13", setCode: "OP-13", setName: "OP-13", label: "[OP-13] OP-13" },
  { category: "op14", setCode: "OP-14", setName: "OP-14", label: "[OP-14] OP-14" },
  { category: "op15", setCode: "OP-15", setName: "OP-15", label: "[OP-15] OP-15" },
  { category: "eb01", setCode: "EB-01", setName: "Memorial Collection", label: "[EB-01] Memorial Collection" },
  { category: "eb02", setCode: "EB-02", setName: "Anime 25th Collection", label: "[EB-02] Anime 25th Collection" },
  { category: "eb03", setCode: "EB-03", setName: "Extra Booster 03", label: "[EB-03] Extra Booster 03" },
  { category: "eb04", setCode: "EB-04", setName: "Extra Booster 04", label: "[EB-04] Extra Booster 04" },
  { category: "prb01", setCode: "PRB-01", setName: "The Best", label: "[PRB-01] The Best" },
  { category: "prb02", setCode: "PRB-02", setName: "Premium Booster 02", label: "[PRB-02] Premium Booster 02" },
  ...Array.from({ length: 30 }, (_, index) => makeStarterDeck(index + 1)),
];

export const getCardSetDefinition = (category: ProductCategory) =>
  cardSetDefinitions.find((set) => set.category === category) ?? cardSetDefinitions[0];

export const getProductCategoryFromCardCode = (cardCode: string): ProductCategory | null => {
  const normalized = cardCode.trim().toLowerCase().replace("-", "");
  const matched = cardSetDefinitions.find((set) => normalized.startsWith(set.category));
  return matched?.category ?? null;
};

export interface RuntimeCardSetDefinition extends CardSetDefinition {
  id?: string;
  isActive: boolean;
  sortOrder: number;
}
