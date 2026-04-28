import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hash } from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { initialMarketplace } from "../lib/mock-data";
import type { ListingMode, ProductCategory } from "../types/marketplace";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://root:password@127.0.0.1:3306/pamoon";

const parseMariaDbUrl = (url: string) => {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  };
};

const adapter = new PrismaMariaDb(parseMariaDbUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

const categoryToDb = (category: ProductCategory) => category.toUpperCase() as Uppercase<ProductCategory>;
const modeToDb = (mode: ListingMode) => mode.toUpperCase() as Uppercase<ListingMode>;

const shopSeeds = [
  {
    slug: "cardhunter",
    name: "CardHunter Shop",
    ownerEmail: "cardhunter@example.local",
    ownerName: "CardHunter",
  },
  {
    slug: "grandline",
    name: "Grand Line Cards",
    ownerEmail: "grandline@example.local",
    ownerName: "Grand Line Owner",
  },
  {
    slug: "romance",
    name: "Romance Dawn Vault",
    ownerEmail: "romance@example.local",
    ownerName: "Romance Dawn Owner",
  },
];

const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required for seeding.`);
  }

  return value;
};

const main = async () => {
  await prisma.order.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await hash(getRequiredEnv("ADMIN_PASSWORD"), 12);
  const demoPasswordHash = await hash(process.env.DEMO_PASSWORD ?? "123456", 12);

  await prisma.user.create({
    data: {
      email: getRequiredEnv("ADMIN_EMAIL"),
      displayName: "Pamoon Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      walletBalanceCents: 0,
      bidLimitCents: 0,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@example.local",
      displayName: "Demo Member",
      passwordHash: demoPasswordHash,
      role: "MEMBER",
      status: "ACTIVE",
      walletBalanceCents: 245000,
      bidLimitCents: 1000000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      userId: member.id,
      type: "TOP_UP",
      status: "COMPLETED",
      amountCents: 245000,
      referenceType: "SEED",
      note: "ยอดเงินเริ่มต้นสำหรับทดสอบ",
    },
  });

  const shopIdBySlug = new Map<string, string>();

  for (const shopSeed of shopSeeds) {
    const owner = await prisma.user.create({
      data: {
        email: shopSeed.ownerEmail,
        displayName: shopSeed.ownerName,
        passwordHash: demoPasswordHash,
        role: "SHOP",
        status: "ACTIVE",
        walletBalanceCents: 0,
        bidLimitCents: 0,
      },
    });

    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: shopSeed.name,
        slug: shopSeed.slug,
        status: "APPROVED",
        rating: 4.9,
        reviewCount: 128,
      },
    });

    shopIdBySlug.set(shop.slug, shop.id);
  }

  const auctionEndsAt = new Date("2028-04-28T17:00:00.000Z");

  await prisma.product.createMany({
    data: initialMarketplace.products.map((product) => {
      const sellerShopId = shopIdBySlug.get(product.shopId);

      if (!sellerShopId) {
        throw new Error(`ไม่พบร้านค้าสำหรับ ${product.shopId}`);
      }

      const currentPriceCents = product.currentPrice * 100;
      const [cardCode, setName] = product.code.split(" · ");

      return {
        sellerShopId,
        title: product.title,
        cardCode: cardCode ?? product.code,
        setCode: product.code.split("-")[0] ?? "OP01",
        setName: setName ?? product.category.toUpperCase(),
        category: categoryToDb(product.category),
        rarity: product.rarity,
        mode: modeToDb(product.mode),
        status: "ACTIVE",
        conditionLabel: "Near Mint",
        description: "ข้อมูลตัวอย่างสำหรับทดสอบระบบหลังบ้าน",
        imageUrl: "/assets/trading-card-products.png",
        openingPriceCents: product.openingPrice * 100,
        currentPriceCents,
        nextBidCents: product.nextBid * 100,
        buyNowPriceCents: product.mode === "buy" ? currentPriceCents : null,
        watcherCount: product.watchers,
        auctionEndsAt: product.mode === "auction" ? auctionEndsAt : null,
      };
    }),
  });

  console.log("Seed completed: admin, users, shops, wallet transaction, and 160 products created.");
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
