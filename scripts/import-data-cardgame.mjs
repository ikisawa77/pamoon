import "dotenv/config";
import mariadb from "mariadb";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/pamoon";
const sourceUrl = process.env.DATA_CARDGAME_SOURCE_URL ?? "https://data-cardgame.com/prices_full.json";
const cardGameName = "One Piece Card Game (Japanese)";

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

const makeSet = (prefix, index, name) => {
  const number = String(index).padStart(2, "0");
  const category = `${prefix}${number}`.toUpperCase();
  const setCode = `${prefix.toUpperCase()}-${number}`;
  const setName = name ?? `${prefix.toUpperCase()}-${number}`;

  return {
    category,
    setCode,
    setName,
    label: `[${setCode}] ${setName}`,
  };
};

const supportedSets = [
  makeSet("op", 1, "Romance Dawn"),
  makeSet("op", 2, "Paramount War"),
  makeSet("op", 3, "Pillars of Strength"),
  makeSet("op", 4, "Kingdoms of Intrigue"),
  makeSet("op", 5, "Awakening of the New Era"),
  makeSet("op", 6, "Wings of the Captain"),
  makeSet("op", 7, "500 Years in the Future"),
  makeSet("op", 8, "Two Legends"),
  makeSet("op", 9, "Emperors in the New World"),
  makeSet("op", 10, "Royal Blood"),
  makeSet("op", 11, "A Fist of Divine Speed"),
  makeSet("op", 12, "Legacy of the Master"),
  makeSet("op", 13),
  makeSet("op", 14),
  makeSet("op", 15),
  makeSet("eb", 1, "Memorial Collection"),
  makeSet("eb", 2, "Anime 25th Collection"),
  makeSet("eb", 3, "Extra Booster 03"),
  makeSet("eb", 4, "Extra Booster 04"),
  { category: "PRB01", setCode: "PRB-01", setName: "The Best", label: "[PRB-01] The Best" },
  { category: "PRB02", setCode: "PRB-02", setName: "Premium Booster 02", label: "[PRB-02] Premium Booster 02" },
  ...Array.from({ length: 30 }, (_, index) => makeSet("st", index + 1, `Starter Deck ${String(index + 1).padStart(2, "0")}`)),
];

const normalizeCardCode = (sourceKey) => sourceKey.toUpperCase().split("_")[0].trim();

const normalizeRarity = (rarity, name) => {
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

const fetchPayload = async () => {
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`โหลดข้อมูลจาก data-cardgame.com ไม่สำเร็จ: ${response.status}`);
  }

  return response.json();
};

const ensureSupportedSets = async (connection) => {
  const gameId = "card_game_one_piece_jp";

  await connection.query(
    `INSERT INTO \`CardGame\` (\`id\`, \`name\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
     VALUES (?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE \`isActive\` = 1, \`updatedAt\` = NOW()`,
    [gameId, cardGameName],
  );

  const [game] = await connection.query("SELECT `id` FROM `CardGame` WHERE `name` = ? LIMIT 1", [cardGameName]);
  const resolvedGameId = game?.id ?? gameId;

  for (const [index, set] of supportedSets.entries()) {
    await connection.query(
      `INSERT INTO \`CardSet\`
        (\`id\`, \`gameId\`, \`category\`, \`setCode\`, \`setName\`, \`label\`, \`isActive\`, \`sortOrder\`, \`createdAt\`, \`updatedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        \`gameId\` = VALUES(\`gameId\`),
        \`setName\` = VALUES(\`setName\`),
        \`label\` = VALUES(\`label\`),
        \`isActive\` = 1,
        \`sortOrder\` = VALUES(\`sortOrder\`),
        \`updatedAt\` = NOW()`,
      [
        `card_set_${set.category.toLowerCase()}`,
        resolvedGameId,
        set.category,
        set.setCode,
        set.setName,
        set.label,
        index + 1,
      ],
    );
  }
};

const main = async () => {
  const connection = await mariadb.createConnection(parseMariaDbUrl(databaseUrl));

  try {
    const payload = await fetchPayload();
    await ensureSupportedSets(connection);
    await connection.query(
      "UPDATE `CardMaster` SET `createdAt` = NOW() WHERE `createdAt` = '0000-00-00 00:00:00'",
    );
    await connection.query(
      "UPDATE `CardMaster` SET `updatedAt` = NOW() WHERE `updatedAt` = '0000-00-00 00:00:00'",
    );
    const cardSets = await connection.query("SELECT `category`, `setCode`, `setName` FROM `CardSet` WHERE `isActive` = 1");
    const setByCategory = new Map(cardSets.map((set) => [String(set.category).toUpperCase(), set]));
    let imported = 0;
    let skipped = 0;

    for (const [rawCategory, cards] of Object.entries(payload)) {
      const category = rawCategory.toUpperCase();
      const cardSet = setByCategory.get(category);

      if (!cardSet || typeof cards !== "object" || !cards) {
        skipped += 1;
        continue;
      }

      for (const [sourceKey, card] of Object.entries(cards)) {
        if (!card || typeof card !== "object") {
          continue;
        }

        const title = String(card.name ?? normalizeCardCode(sourceKey));
        const sourceRarity = String(card.rarity ?? "");
        const row = {
          id: `dcg_${category.toLowerCase()}_${sourceKey.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`.slice(0, 191),
          source: "data-cardgame",
          sourceKey: String(sourceKey).toUpperCase(),
          cardCode: normalizeCardCode(sourceKey),
          title,
          rarity: normalizeRarity(sourceRarity, title),
          sourceRarity,
          category,
          setCode: String(cardSet.setCode),
          setName: String(cardSet.setName),
          imageUrl: typeof card.image_url === "string" ? card.image_url : null,
          priceThb: Number.isFinite(Number(card.thb)) ? Number(card.thb) : null,
          priceJpy: Number.isFinite(Number(card.jpy)) ? Number(card.jpy) : null,
          inStock: Boolean(card.stock),
          raw: JSON.stringify(card),
        };

        await connection.query(
          `INSERT INTO \`CardMaster\`
            (\`id\`, \`source\`, \`sourceKey\`, \`cardCode\`, \`title\`, \`rarity\`, \`sourceRarity\`, \`category\`, \`setCode\`, \`setName\`, \`imageUrl\`, \`priceThb\`, \`priceJpy\`, \`inStock\`, \`raw\`, \`createdAt\`, \`updatedAt\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            \`cardCode\` = VALUES(\`cardCode\`),
            \`title\` = VALUES(\`title\`),
            \`rarity\` = VALUES(\`rarity\`),
            \`sourceRarity\` = VALUES(\`sourceRarity\`),
            \`category\` = VALUES(\`category\`),
            \`setCode\` = VALUES(\`setCode\`),
            \`setName\` = VALUES(\`setName\`),
            \`imageUrl\` = VALUES(\`imageUrl\`),
            \`priceThb\` = VALUES(\`priceThb\`),
            \`priceJpy\` = VALUES(\`priceJpy\`),
            \`inStock\` = VALUES(\`inStock\`),
            \`raw\` = VALUES(\`raw\`),
            \`updatedAt\` = NOW()`,
          [
            row.id,
            row.source,
            row.sourceKey,
            row.cardCode,
            row.title,
            row.rarity,
            row.sourceRarity,
            row.category,
            row.setCode,
            row.setName,
            row.imageUrl,
            row.priceThb,
            row.priceJpy,
            row.inStock,
            row.raw,
          ],
        );
        imported += 1;
      }
    }

    console.log(`นำเข้าข้อมูลการ์ดจาก data-cardgame.com แล้ว ${imported.toLocaleString("th-TH")} รายการ, ข้าม ${skipped.toLocaleString("th-TH")} ชุด`);
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
