import { prisma } from "@/lib/db/prisma";
import { readSessionCookie } from "@/lib/auth/session";

export const getCurrentUser = async () => {
  const session = await readSessionCookie();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      walletBalanceCents: true,
      bidLimitCents: true,
      createdAt: true,
      shops: {
        select: {
          id: true,
          slug: true,
          status: true,
        },
        take: 1,
      },
    },
  });
};
