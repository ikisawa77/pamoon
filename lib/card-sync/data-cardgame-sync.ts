import { cardSetDefinitions, productCategoryValues } from "@/lib/card-catalog";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ProductCategory, ProductRarity } from "@/types/marketplace";

interface DataCardEntry {
  name?: unknown;
  rarity?: unknown;
  thb?: unknown;
  jpy?: unknown;
  stock?: unknown;
  image_url?: unknown;
}

type DataCardSet = Record<string, DataCardEntry>;
type DataCardPayload = Record<string, DataCardSet>;

export interface CardSyncResult {
  imported: number;
  supported: number;
  skipped: number;
  setCount: number;
  sourceUrl: string;
}

const SOURCE_NAME = "data-cardgame";
const CARD_GAME_NAME = "One Piece Card Game (Japanese)";
const DEFAULT_SOURCE_URL = "https://data-cardgame.com/prices_full.json";

const supportedSetByCategory = new Map(cardSetDefinitions.map((set) => [set.category, set]));
const supportedCategories = new Set<string>(productCategoryValues);

const normalizeCardCode = (sourceKey: string) => sourceKey.toUpperCase().split("_")[0].trim();

const normalizeRarity = (rarity: unknown, name: unknown): ProductRarity => {
  const value = String(rarity ?? "").toUpperCase();
  const title = String(name ?? "").toLowerCase();

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

const toNumberOrNull = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const fetchPayload = async (sourceUrl: string): Promise<DataCardPayload> => {
  const response = await fetch(sourceUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`โหลดข้อมูลจาก data-cardgame.com ไม่สำเร็จ: ${response.status}`);
  }

  const payload: unknown = await response.json();

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("รูปแบบข้อมูลจาก data-cardgame.com ไม่ถูกต้อง");
  }

  return payload as DataCardPayload;
};

const ensureSupportedSet = async (category: ProductCategory, index: number) => {
  const set = supportedSetByCategory.get(category);

  if (!set) {
    return null;
  }

  const game = await prisma.cardGame.upsert({
    where: { name: CARD_GAME_NAME },
    create: { name: CARD_GAME_NAME, isActive: true },
    update: { isActive: true },
  });

  return prisma.cardSet.upsert({
    where: { category: category.toUpperCase() as Uppercase<ProductCategory> },
    create: {
      gameId: game.id,
      category: category.toUpperCase() as Uppercase<ProductCategory>,
      setCode: set.setCode,
      setName: set.setName,
      label: set.label,
      sortOrder: index + 1,
      isActive: true,
    },
    update: {
      gameId: game.id,
      setName: set.setName,
      label: set.label,
      sortOrder: index + 1,
      isActive: true,
    },
  });
};

export const syncDataCardgameCatalog = async (sourceUrl = process.env.DATA_CARDGAME_SOURCE_URL ?? DEFAULT_SOURCE_URL): Promise<CardSyncResult> => {
  const run = await prisma.cardImportRun.create({
    data: {
      source: SOURCE_NAME,
      status: "RUNNING",
      message: sourceUrl,
    },
  });

  try {
    const payload = await fetchPayload(sourceUrl);
    const supportedOrder = new Map(productCategoryValues.map((category, index) => [category, index]));
    let imported = 0;
    let supported = 0;
    let skipped = 0;

    for (const [rawCategory, cards] of Object.entries(payload)) {
      const sourceCategory = rawCategory.toLowerCase();
      const supportedCategory = supportedCategories.has(sourceCategory) ? (sourceCategory as ProductCategory) : null;
      const supportedSet = supportedCategory ? supportedSetByCategory.get(supportedCategory) : null;
      const cardSet = supportedCategory ? await ensureSupportedSet(supportedCategory, supportedOrder.get(supportedCategory) ?? 999) : null;
      const setCode = supportedSet?.setCode ?? sourceCategory.toUpperCase();
      const setName = supportedSet?.setName ?? sourceCategory.toUpperCase();
      const label = supportedSet?.label ?? `[${setCode}] ${setName}`;
      const entries = Object.entries(cards ?? {});

      const externalSet = await prisma.externalCardSet.upsert({
        where: { source_sourceCategory: { source: SOURCE_NAME, sourceCategory } },
        create: {
          source: SOURCE_NAME,
          sourceCategory,
          gameName: CARD_GAME_NAME,
          setCode,
          setName,
          label,
          isSupported: Boolean(supportedCategory),
          cardCount: entries.length,
        },
        update: {
          gameName: CARD_GAME_NAME,
          setCode,
          setName,
          label,
          isSupported: Boolean(supportedCategory),
          cardCount: entries.length,
        },
      });

      for (const [sourceKey, card] of entries) {
        if (!card || typeof card !== "object") {
          skipped += 1;
          continue;
        }

        const title = String(card.name ?? normalizeCardCode(sourceKey));
        const sourceRarity = String(card.rarity ?? "");
        const normalizedRarity = normalizeRarity(sourceRarity, title);
        const normalizedSourceKey = sourceKey.toUpperCase();
        const cardCode = normalizeCardCode(sourceKey);
        const imageUrl = typeof card.image_url === "string" ? card.image_url : null;
        const priceThb = toNumberOrNull(card.thb);
        const priceJpy = toNumberOrNull(card.jpy);
        const raw = toJsonValue(card);

        await prisma.externalCardMaster.upsert({
          where: { source_sourceCategory_sourceKey: { source: SOURCE_NAME, sourceCategory, sourceKey: normalizedSourceKey } },
          create: {
            externalSetId: externalSet.id,
            source: SOURCE_NAME,
            sourceCategory,
            sourceKey: normalizedSourceKey,
            cardCode,
            title,
            rarity: sourceRarity || normalizedRarity,
            gameName: CARD_GAME_NAME,
            setCode,
            setName,
            imageUrl,
            priceThb,
            priceJpy,
            inStock: Boolean(card.stock),
            raw,
          },
          update: {
            externalSetId: externalSet.id,
            cardCode,
            title,
            rarity: sourceRarity || normalizedRarity,
            gameName: CARD_GAME_NAME,
            setCode,
            setName,
            imageUrl,
            priceThb,
            priceJpy,
            inStock: Boolean(card.stock),
            raw,
          },
        });

        imported += 1;

        if (!supportedCategory || !cardSet) {
          continue;
        }

        await prisma.cardMaster.upsert({
          where: {
            source_category_sourceKey: {
              source: SOURCE_NAME,
              category: supportedCategory.toUpperCase() as Uppercase<ProductCategory>,
              sourceKey: normalizedSourceKey,
            },
          },
          create: {
            source: SOURCE_NAME,
            sourceKey: normalizedSourceKey,
            cardCode,
            title,
            rarity: normalizedRarity,
            sourceRarity,
            category: supportedCategory.toUpperCase() as Uppercase<ProductCategory>,
            setCode: cardSet.setCode,
            setName: cardSet.setName,
            imageUrl,
            priceThb,
            priceJpy,
            inStock: Boolean(card.stock),
            raw,
          },
          update: {
            cardCode,
            title,
            rarity: normalizedRarity,
            sourceRarity,
            setCode: cardSet.setCode,
            setName: cardSet.setName,
            imageUrl,
            priceThb,
            priceJpy,
            inStock: Boolean(card.stock),
            raw,
          },
        });
        supported += 1;
      }
    }

    const result = {
      imported,
      supported,
      skipped,
      setCount: Object.keys(payload).length,
      sourceUrl,
    };

    await prisma.cardImportRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        imported,
        supported,
        skipped,
        setCount: result.setCount,
        finishedAt: new Date(),
        message: `นำเข้า ${imported.toLocaleString("th-TH")} รายการ / รองรับ marketplace ${supported.toLocaleString("th-TH")} รายการ`,
      },
    });

    return result;
  } catch (error) {
    await prisma.cardImportRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        message: error instanceof Error ? error.message : "sync คลังการ์ดไม่สำเร็จ",
      },
    });
    throw error;
  }
};
