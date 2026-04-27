import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";

const defaultDatabaseUrl = "mysql://root:password@localhost:3306/pamoon";

const parseMariaDbUrl = (databaseUrl: string) => {
  const parsed = new URL(databaseUrl);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  };
};

const createPrismaClient = () => {
  const adapter = new PrismaMariaDb(parseMariaDbUrl(process.env.DATABASE_URL ?? defaultDatabaseUrl));
  return new PrismaClient({ adapter });
};

declare global {
  var pamoonPrisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const prisma = globalThis.pamoonPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.pamoonPrisma = prisma;
}

