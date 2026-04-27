import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("database health check timed out")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const GET = async () => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    return NextResponse.json({
      ok: true,
      app: "pamoon",
      database: "connected",
      checkedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown database error";
    return NextResponse.json(
      {
        ok: false,
        app: "pamoon",
        database: "unavailable",
        message,
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
};
