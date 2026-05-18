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

    const dbSetsByCategory = new Map(sets.map((set) => [set.category.toLowerCase(), set]));

    return cardSetDefinitions
      .map((definition, index) => {
        const dbSet = dbSetsByCategory.get(definition.category);

        if (!dbSet) {
          return { ...definition, isActive: true, sortOrder: index + 1 };
        }

        return {
          id: dbSet.id,
          category: dbSet.category.toLowerCase() as ProductCategory,
          setCode: dbSet.setCode,
          setName: dbSet.setName,
          label: dbSet.label,
          isActive: dbSet.isActive,
          sortOrder: dbSet.sortOrder,
        };
      })
      .filter((set) => set.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.setCode.localeCompare(right.setCode));
  } catch {
    return cardSetDefinitions.map((set, index) => ({ ...set, isActive: true, sortOrder: index + 1 }));
  }
};

export const getCardSetDefinitionFromDb = async (category: ProductCategory) => {
  const sets = await getActiveCardSets();
  return sets.find((set) => set.category === category) ?? getCardSetDefinition(category);
};
