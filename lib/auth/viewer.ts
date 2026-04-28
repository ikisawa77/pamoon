import { getCurrentUser } from "@/lib/auth/current-user";
import type { ViewerSummary } from "@/types/marketplace";

export const getViewerSummary = async (): Promise<ViewerSummary | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const primaryShop = user.shops[0];

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    shopId: primaryShop?.id,
    shopStatus: primaryShop?.status,
  };
};
