import "dotenv/config";
import mariadb from "mariadb";
import { hash } from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://root:password@127.0.0.1:3306/pamoon";

const parseMariaDbUrl = (url) => {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    charset: "utf8mb4",
  };
};

const shopSeeds = [
  { slug: "cardhunter", name: "CardHunter Shop", ownerEmail: "cardhunter@example.local", ownerName: "CardHunter" },
  { slug: "grandline", name: "Grand Line Cards", ownerEmail: "grandline@example.local", ownerName: "Grand Line Owner" },
  { slug: "romance", name: "Romance Dawn Vault", ownerEmail: "romance@example.local", ownerName: "Romance Dawn Owner" },
];
const rarities = ["C", "UC", "R", "L", "SR", "SEC", "SP", "P"];
const sets = [
  { category: "OP01", code: "OP01", name: "ROMANCE DAWN" },
  { category: "OP02", code: "OP02", name: "PARAMOUNT WAR" },
  { category: "OP03", code: "OP03", name: "PILLARS OF STRENGTH" },
  { category: "OP04", code: "OP04", name: "KINGDOMS OF INTRIGUE" },
  { category: "OP05", code: "OP05", name: "AWAKENING OF THE NEW ERA" },
];
const cardNames = [
  "Monkey D. Luffy",
  "Roronoa Zoro",
  "Nami",
  "Usopp",
  "Sanji",
  "Tony Tony Chopper",
  "Nico Robin",
  "Franky",
  "Brook",
  "Jinbe",
  "Shanks",
  "Trafalgar Law",
  "Eustass Kid",
  "Yamato",
  "Boa Hancock",
  "Portgas D. Ace",
  "Sabo",
  "Edward Newgate",
  "Kaido",
  "Charlotte Linlin",
  "Donquixote Doflamingo",
  "Crocodile",
  "Dracule Mihawk",
  "Buggy",
  "Rob Lucci",
  "Kaku",
  "Enel",
  "Perona",
  "Marco",
  "Kuzan",
  "Borsalino",
  "Sakazuki",
  "Rebecca",
  "Vinsmoke Reiju",
  "Carrot",
  "Tashigi",
  "Smoker",
  "Gecko Moria",
  "Silvers Rayleigh",
  "Gol D. Roger",
];
const rarityPriceBase = { C: 80, UC: 150, R: 320, L: 750, SR: 1600, SEC: 3600, SP: 6200, P: 9800 };

const id = (prefix, index) => `seed_${prefix}_${String(index).padStart(3, "0")}`;
const getRequiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required for seeding.`);
  }

  return value;
};
const makeProduct = (index, mode, shopIdBySlug) => {
  const rarity = rarities[index % rarities.length];
  const set = sets[index % sets.length];
  const shop = shopSeeds[index % shopSeeds.length];
  const basePrice = rarityPriceBase[rarity] + index * 37 + (mode === "AUCTION" ? 250 : 520);
  const currentPriceCents = Math.round(basePrice / 10) * 1000;

  return {
    id: id(mode.toLowerCase(), index + 1),
    sellerShopId: shopIdBySlug.get(shop.slug),
    title: `${cardNames[index % cardNames.length]} (${rarity})`,
    cardCode: `${set.code}-${String((index % 121) + 1).padStart(3, "0")} ${rarity}`,
    setCode: set.code,
    setName: set.name,
    category: set.category,
    rarity,
    mode,
    status: "ACTIVE",
    conditionLabel: "Near Mint",
    description: "ข้อมูลตัวอย่างสำหรับทดสอบระบบหลังบ้าน",
    imageUrl: "/assets/trading-card-products.png",
    openingPriceCents: Math.max(5000, Math.round((currentPriceCents * 0.72) / 1000) * 1000),
    currentPriceCents,
    nextBidCents: currentPriceCents + Math.max(10000, Math.round(currentPriceCents * 0.05)),
    buyNowPriceCents: mode === "BUY" ? currentPriceCents : null,
    watcherCount: 12 + (index * 11) % 139,
    auctionEndsAt: mode === "AUCTION" ? new Date("2028-04-28T17:00:00.000Z") : null,
  };
};

const insert = async (connection, table, row) => {
  const keys = Object.keys(row);
  const columns = keys.map((key) => `\`${key}\``).join(", ");
  const placeholders = keys.map(() => "?").join(", ");
  await connection.query(`INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`, keys.map((key) => row[key]));
};

const main = async () => {
  const connection = await mariadb.createConnection(parseMariaDbUrl(databaseUrl));
  const now = new Date();
  const adminPasswordHash = await hash(getRequiredEnv("ADMIN_PASSWORD"), 12);
  const demoPasswordHash = await hash(process.env.DEMO_PASSWORD ?? "123456", 12);

  await connection.beginTransaction();
  try {
    for (const table of ["ChatMessage", "ChatThread", "ModerationCase", "Notification", "Order", "Bid", "WalletTransaction", "Product", "Shop", "User"]) {
      await connection.query(`DELETE FROM \`${table}\``);
    }

    await insert(connection, "User", {
      id: id("user", 1),
      email: getRequiredEnv("ADMIN_EMAIL"),
      displayName: "Pamoon Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      walletBalanceCents: 5000000,
      bidLimitCents: 5000000,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "WalletTransaction", {
      id: id("wallet", 99),
      userId: id("user", 1),
      type: "TOP_UP",
      status: "COMPLETED",
      amountCents: 5000000,
      referenceType: "ADMIN_TEST_SEED",
      referenceId: null,
      note: "ทุนทดสอบสำหรับผู้ดูแลระบบ",
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "Shop", {
      id: id("shop", 99),
      ownerId: id("user", 1),
      name: "Admin Dev Shop",
      slug: "admin-dev-shop",
      status: "APPROVED",
      rating: 5,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "User", {
      id: id("user", 2),
      email: "member@example.local",
      displayName: "Demo Member",
      passwordHash: demoPasswordHash,
      role: "MEMBER",
      status: "ACTIVE",
      walletBalanceCents: 2450000,
      bidLimitCents: 1000000,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "WalletTransaction", {
      id: id("wallet", 1),
      userId: id("user", 2),
      type: "TOP_UP",
      status: "COMPLETED",
      amountCents: 2450000,
      referenceType: "SEED",
      referenceId: null,
      note: "ยอดเงินเริ่มต้นสำหรับทดสอบ",
      createdAt: now,
      updatedAt: now,
    });

    const shopIdBySlug = new Map();
    for (const [index, shopSeed] of shopSeeds.entries()) {
      const ownerId = id("shop_owner", index + 1);
      const shopId = id("shop", index + 1);
      await insert(connection, "User", {
        id: ownerId,
        email: shopSeed.ownerEmail,
        displayName: shopSeed.ownerName,
        passwordHash: demoPasswordHash,
        role: "SHOP",
        status: "ACTIVE",
        walletBalanceCents: 0,
        bidLimitCents: 0,
        createdAt: now,
        updatedAt: now,
      });
      await insert(connection, "Shop", {
        id: shopId,
        ownerId,
        name: shopSeed.name,
        slug: shopSeed.slug,
        status: "APPROVED",
        rating: 4.9,
        reviewCount: 128,
        createdAt: now,
        updatedAt: now,
      });
      shopIdBySlug.set(shopSeed.slug, shopId);
    }

    const products = [
      ...Array.from({ length: 80 }, (_, index) => makeProduct(index, "AUCTION", shopIdBySlug)),
      ...Array.from({ length: 80 }, (_, index) => makeProduct(index, "BUY", shopIdBySlug)),
    ];
    for (const product of products) {
      await insert(connection, "Product", { ...product, createdAt: now, updatedAt: now });
    }

    const auctionOrderId = id("order", 1);
    await insert(connection, "Bid", {
      id: id("bid", 1),
      productId: id("auction", 1),
      bidderId: id("user", 2),
      amountCents: products[0].currentPriceCents,
      status: "WINNING",
      createdAt: now,
    });
    await connection.query("UPDATE `Product` SET `status` = 'ENDED', `updatedAt` = ? WHERE `id` = ?", [now, id("auction", 1)]);
    await insert(connection, "Order", {
      id: auctionOrderId,
      productId: id("auction", 1),
      buyerId: id("user", 2),
      sellerShopId: products[0].sellerShopId,
      amountCents: products[0].currentPriceCents,
      platformFeeCents: 0,
      status: "PENDING_PAYMENT",
      shippingName: "Demo Member",
      shippingAddress: null,
      source: "AUCTION",
      paymentDueAt: new Date(now.getTime() + 23 * 60 * 60 * 1000),
      paidAt: null,
      shipDueAt: null,
      shippedAt: null,
      shippingExtendedAt: null,
      shippingExtensionCount: 0,
      refundDueAt: null,
      refundedAt: null,
      completedAt: null,
      cancelledAt: null,
      trackingNumber: null,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "Notification", {
      id: id("notification", 1),
      recipientId: id("user", 2),
      actorId: id("shop_owner", 1),
      type: "AUCTION_WON",
      title: "ตัวอย่าง: ชนะประมูลรอชำระเงิน",
      message: `คุณชนะประมูล ${products[0].title} กรุณาชำระเงินภายใน 24 ชม.`,
      href: "/account/orders",
      productId: id("auction", 1),
      orderId: auctionOrderId,
      bidId: id("bid", 1),
      readAt: null,
      createdAt: now,
    });

    const paidOrderId = id("order", 2);
    const paidProduct = products[80];
    await connection.query("UPDATE `Product` SET `status` = 'SOLD', `updatedAt` = ? WHERE `id` = ?", [now, paidProduct.id]);
    await insert(connection, "Order", {
      id: paidOrderId,
      productId: paidProduct.id,
      buyerId: id("user", 2),
      sellerShopId: paidProduct.sellerShopId,
      amountCents: paidProduct.currentPriceCents,
      platformFeeCents: 0,
      status: "PAID",
      shippingName: "Demo Member",
      shippingAddress: "ที่อยู่ตัวอย่างสำหรับทดสอบ SLA",
      source: "BUY_NOW",
      paymentDueAt: null,
      paidAt: now,
      shipDueAt: new Date(now.getTime() + 46 * 60 * 60 * 1000),
      shippedAt: null,
      shippingExtendedAt: null,
      shippingExtensionCount: 0,
      refundDueAt: null,
      refundedAt: null,
      completedAt: null,
      cancelledAt: null,
      trackingNumber: null,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "ChatThread", {
      id: id("thread", 1),
      orderId: paidOrderId,
      buyerId: id("user", 2),
      sellerShopId: paidProduct.sellerShopId,
      productId: paidProduct.id,
      status: "ACTIVE",
      lastMessageAt: now,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "ChatMessage", {
      id: id("message", 1),
      threadId: id("thread", 1),
      senderId: id("user", 2),
      body: "สวัสดีครับ หลังชำระเงินแล้วขอเลขพัสดุเมื่อจัดส่งด้วยครับ",
      readAt: null,
      createdAt: now,
    });
    await insert(connection, "ChatMessage", {
      id: id("message", 2),
      threadId: id("thread", 1),
      senderId: id("shop_owner", 1),
      body: "รับทราบครับ จะจัดส่งภายใน SLA 48 ชม.",
      readAt: null,
      createdAt: now,
    });
    await insert(connection, "Notification", {
      id: id("notification", 2),
      recipientId: id("shop_owner", 1),
      actorId: id("user", 2),
      type: "SHIPPING_DUE",
      title: "ตัวอย่าง: รอร้านค้าจัดส่ง",
      message: `${id("user", 2)} ชำระเงิน ${paidProduct.title} แล้ว`,
      href: "/account/orders",
      productId: paidProduct.id,
      orderId: paidOrderId,
      bidId: null,
      readAt: null,
      createdAt: now,
    });

    const refundOrderId = id("order", 3);
    const refundProduct = products[81];
    await connection.query("UPDATE `Product` SET `status` = 'SOLD', `updatedAt` = ? WHERE `id` = ?", [now, refundProduct.id]);
    await insert(connection, "Order", {
      id: refundOrderId,
      productId: refundProduct.id,
      buyerId: id("user", 2),
      sellerShopId: refundProduct.sellerShopId,
      amountCents: refundProduct.currentPriceCents,
      platformFeeCents: 0,
      status: "REFUND_PENDING",
      shippingName: "Demo Member",
      shippingAddress: null,
      source: "BUY_NOW",
      paymentDueAt: null,
      paidAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      shipDueAt: new Date(now.getTime() - 60 * 60 * 1000),
      shippedAt: null,
      shippingExtendedAt: null,
      shippingExtensionCount: 0,
      refundDueAt: new Date(now.getTime() + 23 * 60 * 60 * 1000),
      refundedAt: null,
      completedAt: null,
      cancelledAt: null,
      trackingNumber: null,
      createdAt: now,
      updatedAt: now,
    });
    await insert(connection, "ModerationCase", {
      id: id("case", 1),
      type: "SELLER_SHIPPING_OVERDUE",
      status: "OPEN",
      userId: id("shop_owner", 2),
      shopId: refundProduct.sellerShopId,
      orderId: refundOrderId,
      assignedToId: null,
      reason: "ตัวอย่างร้านค้าเลยกำหนดส่งสินค้า รอคืนเงินและตรวจสอบ",
      createdAt: now,
      resolvedAt: null,
    });
    await insert(connection, "Notification", {
      id: id("notification", 3),
      recipientId: id("user", 2),
      actorId: id("shop_owner", 2),
      type: "SHIPPING_OVERDUE",
      title: "ตัวอย่าง: ร้านค้าเลยกำหนดจัดส่ง",
      message: `ระบบกำลังคืนเงินสำหรับ ${refundProduct.title}`,
      href: "/account/orders",
      productId: refundProduct.id,
      orderId: refundOrderId,
      bidId: null,
      readAt: null,
      createdAt: now,
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
