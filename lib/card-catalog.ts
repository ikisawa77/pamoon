import type { ProductCategory } from "@/types/marketplace";

export const CARD_GAME_NAME = "One Piece Card Game (Japanese)";

export interface CardSetDefinition {
  category: ProductCategory;
  setCode: string;
  setName: string;
  label: string;
}

export const cardSetDefinitions: CardSetDefinition[] = [
  { category: "op01", setCode: "OP-01", setName: "Romance Dawn", label: "[OP-01] Romance Dawn" },
  { category: "op02", setCode: "OP-02", setName: "Paramount War", label: "[OP-02] Paramount War" },
  { category: "op03", setCode: "OP-03", setName: "Pillars of Strength", label: "[OP-03] Pillars of Strength" },
  { category: "op04", setCode: "OP-04", setName: "Kingdoms of Intrigue", label: "[OP-04] Kingdoms of Intrigue" },
  { category: "op05", setCode: "OP-05", setName: "Awakening of the New Era", label: "[OP-05] Awakening of the New Era" },
];

export const getCardSetDefinition = (category: ProductCategory) =>
  cardSetDefinitions.find((set) => set.category === category) ?? cardSetDefinitions[0];
