import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { unknownError } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = async () => {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, shops });
  } catch (error: unknown) {
    return unknownError(error);
  }
};

