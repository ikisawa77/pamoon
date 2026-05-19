import "server-only";
import { cardSetDefinitions, getCardSetDefinition, getProductCategoryFromCardCode } from "@/lib/card-catalog";
import { prisma } from "@/lib/db/prisma";
import type { ProductCategory, ProductRarity } from "@/types/marketplace";

interface DataCardEntry {
  name?: string;
  rarity?: string;
  thb?: number;
  jpy?: number;
  stock?: boolean;
  image_url?: string;
}

type DataCardSet = Record<string, DataCardEntry>;
type DataCardPayload = Record<string, DataCardSet>;

export interface CardLookupResult {
  cardCode: string;
  title: string;
  rarity: ProductRarity;
  sourceRarity: string;
  category: ProductCategory;
  setCode: string;
  setName: string;
  setLabel: string;
  imageUrl: string | null;
  priceThb: number | null;
}

let payloadPromise: Promise<DataCardPayload> | null = null;

const fetchPayload = async () => {
  if (!payloadPromise) {
    payloadPromise = fetch("https://data-cardgame.com/prices_full.json", {
      next: { revalidate: 60 * 60 * 6 },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error("โหลดข้อมูลการ์ดจาก data-cardgame.com ไม่สำเร็จ");
      }

      return (await response.json()) as DataCardPayload;
    });
  }

  return payloadPromise;
};

const normalizeCardCode = (cardCode: string) => cardCode.trim().toUpperCase().replace(/\s+/g, "");

const normalizeRarity = (rarity: string | undefined, name: string | undefined): ProductRarity => {
  const value = (rarity ?? "").toUpperCase();
  const title = (name ?? "").toLowerCase();

  if (value.startsWith("P") || title.includes("parallel")) return "P";
  if (value.includes("SEC")) return "SEC";
  if (value.includes("SP")) return "SP";
  if (value.includes("SR")) return "SR";
  if (value.includes("UC")) return "UC";
  if (value.includes("L")) return "L";
  if (value.includes("R")) return "R";
  if (value.includes("C")) return "C";

  return "P";
};

const findBestCard = (cards: DataCardSet, baseCode: string) => {
  const entries = Object.entries(cards);
  const exact = entries.find(([key]) => key.toUpperCase() === baseCode);

  if (exact) {
    return exact;
  }

  return entries.find(([key]) => key.toUpperCase().startsWith(`${baseCode}_`)) ?? null;
};

const fromDb = async (normalizedCode: string, preferredCategory?: ProductCategory): Promise<CardLookupResult | null> => {
  const detectedCategory = getProductCategoryFromCardCode(normalizedCode);
  const primaryCategory = preferredCategory ?? detectedCategory ?? undefined;
  const card = await prisma.cardMaster.findFirst({
    where: {
      OR: [{ cardCode: normalizedCode }, { sourceKey: { startsWith: normalizedCode } }],
      ...(primaryCategory ? { category: primaryCategory.toUpperCase() as never } : {}),
    },
    orderBy: [{ sourceKey: "asc" }],
  }) ?? await prisma.cardMaster.findFirst({
    where: {
      OR: [{ cardCode: normalizedCode }, { sourceKey: { startsWith: normalizedCode } }],
    },
    orderBy: [{ sourceKey: "asc" }],
  });

  if (!card) {
    return null;
  }

  const set = getCardSetDefinition(card.category.toLowerCase() as ProductCategory);

  return {
    cardCode: card.cardCode,
    title: card.title,
    rarity: card.rarity as ProductRarity,
    sourceRarity: card.sourceRarity,
    category: card.category.toLowerCase() as ProductCategory,
    setCode: card.setCode,
    setName: card.setName,
    setLabel: set.label,
    imageUrl: card.imageUrl,
    priceThb: card.priceThb,
  };
};

const fromRemote = async (normalizedCode: string, preferredCategory?: ProductCategory): Promise<CardLookupResult | null> => {
  const payload = await fetchPayload();
  const detectedCategory = getProductCategoryFromCardCode(normalizedCode);
  const categoriesToTry = [
    preferredCategory,
    detectedCategory,
    ...cardSetDefinitions.map((set) => set.category),
  ].filter((value, index, list): value is ProductCategory => Boolean(value) && list.indexOf(value) === index);

  for (const category of categoriesToTry) {
    const cards = payload[category];

    if (!cards) {
      continue;
    }

    const found = findBestCard(cards, normalizedCode);

    if (!found) {
      continue;
    }

    const [sourceKey, card] = found;
    const set = getCardSetDefinition(category);
    const sourceRarity = String(card.rarity ?? "");

    return {
      cardCode: sourceKey.includes("_") ? normalizedCode : sourceKey.toUpperCase(),
      title: String(card.name ?? normalizedCode),
      rarity: normalizeRarity(sourceRarity, card.name),
      sourceRarity,
      category,
      setCode: set.setCode,
      setName: set.setName,
      setLabel: set.label,
      imageUrl: typeof card.image_url === "string" ? card.image_url : null,
      priceThb: typeof card.thb === "number" ? card.thb : null,
    };
  }

  return null;
};

export const lookupCardByCode = async (cardCode: string, preferredCategory?: ProductCategory): Promise<CardLookupResult | null> => {
  const normalizedCode = normalizeCardCode(cardCode);

  if (!/^(?:OP|EB|ST)\d{2}-\d{3}$|^PRB\d{2}-\d{3}$/.test(normalizedCode)) {
    return null;
  }

  return (await fromDb(normalizedCode, preferredCategory)) ?? fromRemote(normalizedCode, preferredCategory);
};
