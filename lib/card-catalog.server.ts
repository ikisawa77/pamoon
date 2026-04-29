import "server-only";
import { cardSetDefinitions, getCardSetDefinition, type RuntimeCardSetDefinition } from "@/lib/card-catalog";
import { prisma } from "@/lib/db/prisma";
import type { ProductCategory } from "@/types/marketplace";

export const getActiveCardSets = async (): Promise<RuntimeCardSetDefinition[]> => {
  try {
    const sets = await prisma.cardSet.findMany({
      where: { isActive: true, game: { isActive: true } },
      orderBy: [{ sortOrder: "asc" }, { setCode: "asc" }],
    });

    if (sets.length === 0) {
      return cardSetDefinitions.map((set, index) => ({ ...set, isActive: true, sortOrder: index + 1 }));
    }

    return sets.map((set) => ({
      id: set.id,
      category: set.category.toLowerCase() as ProductCategory,
      setCode: set.setCode,
      setName: set.setName,
      label: set.label,
      isActive: set.isActive,
      sortOrder: set.sortOrder,
    }));
  } catch {
    return cardSetDefinitions.map((set, index) => ({ ...set, isActive: true, sortOrder: index + 1 }));
  }
};

export const getCardSetDefinitionFromDb = async (category: ProductCategory) => {
  const sets = await getActiveCardSets();
  return sets.find((set) => set.category === category) ?? getCardSetDefinition(category);
};
