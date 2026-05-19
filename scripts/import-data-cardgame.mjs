import "dotenv/config";
import mariadb from "mariadb";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/pamoon";
const sourceUrl = process.env.DATA_CARDGAME_SOURCE_URL ?? "https://data-cardgame.com/prices_full.json";
const sourceName = "data-cardgame";
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

  return { category, setCode, setName, label: `[${setCode}] ${setName}` };
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
const supportedSetByCategory = new Map(supportedSets.map((set) => [set.category, set]));

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
      [`card_set_${set.category.toLowerCase()}`, resolvedGameId, set.category, set.setCode, set.setName, set.label, index + 1],
    );
  }
};

const main = async () => {
  const connection = await mariadb.createConnection(parseMariaDbUrl(databaseUrl));
  let runId = null;

  try {
    const payload = await fetchPayload();
    await ensureSupportedSets(connection);
    const runResult = await connection.query(
      "INSERT INTO `CardImportRun` (`id`, `source`, `status`, `message`, `startedAt`) VALUES (?, ?, 'RUNNING', ?, NOW())",
      [`card_import_${Date.now()}`, sourceName, sourceUrl],
    );
    runId = runResult.insertId ? String(runResult.insertId) : `card_import_${Date.now()}`;
    const [run] = await connection.query("SELECT `id` FROM `CardImportRun` WHERE `source` = ? ORDER BY `startedAt` DESC LIMIT 1", [sourceName]);
    runId = run?.id ?? runId;

    const cardSets = await connection.query("SELECT `category`, `setCode`, `setName` FROM `CardSet` WHERE `isActive` = 1");
    const setByCategory = new Map(cardSets.map((set) => [String(set.category).toUpperCase(), set]));
    let imported = 0;
    let supported = 0;
    let skipped = 0;

    for (const [rawCategory, cards] of Object.entries(payload)) {
      const sourceCategory = rawCategory.toLowerCase();
      const category = rawCategory.toUpperCase();
      const supportedSet = supportedSetByCategory.get(category);
      const cardSet = setByCategory.get(category);
      const setCode = supportedSet?.setCode ?? category;
      const setName = supportedSet?.setName ?? category;
      const label = supportedSet?.label ?? `[${setCode}] ${setName}`;
      const entries = Object.entries(cards ?? {});

      await connection.query(
        `INSERT INTO \`ExternalCardSet\`
          (\`id\`, \`source\`, \`sourceCategory\`, \`gameName\`, \`setCode\`, \`setName\`, \`label\`, \`isSupported\`, \`cardCount\`, \`createdAt\`, \`updatedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
          \`gameName\` = VALUES(\`gameName\`),
          \`setCode\` = VALUES(\`setCode\`),
          \`setName\` = VALUES(\`setName\`),
          \`label\` = VALUES(\`label\`),
          \`isSupported\` = VALUES(\`isSupported\`),
          \`cardCount\` = VALUES(\`cardCount\`),
          \`updatedAt\` = NOW()`,
        [`external_set_${sourceCategory}`, sourceName, sourceCategory, cardGameName, setCode, setName, label, Boolean(cardSet), entries.length],
      );
      const [externalSet] = await connection.query("SELECT `id` FROM `ExternalCardSet` WHERE `source` = ? AND `sourceCategory` = ? LIMIT 1", [
        sourceName,
        sourceCategory,
      ]);

      for (const [sourceKey, card] of entries) {
        if (!card || typeof card !== "object") {
          skipped += 1;
          continue;
        }

        const title = String(card.name ?? normalizeCardCode(sourceKey));
        const sourceRarity = String(card.rarity ?? "");
        const rarity = normalizeRarity(sourceRarity, title);
        const normalizedSourceKey = String(sourceKey).toUpperCase();
        const cardCode = normalizeCardCode(sourceKey);
        const imageUrl = typeof card.image_url === "string" ? card.image_url : null;
        const priceThb = Number.isFinite(Number(card.thb)) ? Number(card.thb) : null;
        const priceJpy = Number.isFinite(Number(card.jpy)) ? Number(card.jpy) : null;
        const raw = JSON.stringify(card);

        await connection.query(
          `INSERT INTO \`ExternalCardMaster\`
            (\`id\`, \`externalSetId\`, \`source\`, \`sourceCategory\`, \`sourceKey\`, \`cardCode\`, \`title\`, \`rarity\`, \`gameName\`, \`setCode\`, \`setName\`, \`imageUrl\`, \`priceThb\`, \`priceJpy\`, \`inStock\`, \`raw\`, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
            \`externalSetId\` = VALUES(\`externalSetId\`),
            \`cardCode\` = VALUES(\`cardCode\`),
            \`title\` = VALUES(\`title\`),
            \`rarity\` = VALUES(\`rarity\`),
            \`gameName\` = VALUES(\`gameName\`),
            \`setCode\` = VALUES(\`setCode\`),
            \`setName\` = VALUES(\`setName\`),
            \`imageUrl\` = VALUES(\`imageUrl\`),
            \`priceThb\` = VALUES(\`priceThb\`),
            \`priceJpy\` = VALUES(\`priceJpy\`),
            \`inStock\` = VALUES(\`inStock\`),
            \`raw\` = VALUES(\`raw\`),
            \`updatedAt\` = NOW()`,
          [
            `external_${sourceCategory}_${normalizedSourceKey.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`.slice(0, 191),
            externalSet.id,
            sourceName,
            sourceCategory,
            normalizedSourceKey,
            cardCode,
            title,
            sourceRarity || rarity,
            cardGameName,
            setCode,
            setName,
            imageUrl,
            priceThb,
            priceJpy,
            Boolean(card.stock),
            raw,
          ],
        );
        imported += 1;

        if (!cardSet) {
          continue;
        }

        await connection.query(
          `INSERT INTO \`CardMaster\`
            (\`id\`, \`source\`, \`sourceKey\`, \`cardCode\`, \`title\`, \`rarity\`, \`sourceRarity\`, \`category\`, \`setCode\`, \`setName\`, \`imageUrl\`, \`priceThb\`, \`priceJpy\`, \`inStock\`, \`raw\`, \`createdAt\`, \`updatedAt\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
            \`cardCode\` = VALUES(\`cardCode\`),
            \`title\` = VALUES(\`title\`),
            \`rarity\` = VALUES(\`rarity\`),
            \`sourceRarity\` = VALUES(\`sourceRarity\`),
            \`setCode\` = VALUES(\`setCode\`),
            \`setName\` = VALUES(\`setName\`),
            \`imageUrl\` = VALUES(\`imageUrl\`),
            \`priceThb\` = VALUES(\`priceThb\`),
            \`priceJpy\` = VALUES(\`priceJpy\`),
            \`inStock\` = VALUES(\`inStock\`),
            \`raw\` = VALUES(\`raw\`),
            \`updatedAt\` = NOW()`,
          [
            `dcg_${category.toLowerCase()}_${normalizedSourceKey.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`.slice(0, 191),
            sourceName,
            normalizedSourceKey,
            cardCode,
            title,
            rarity,
            sourceRarity,
            category,
            String(cardSet.setCode),
            String(cardSet.setName),
            imageUrl,
            priceThb,
            priceJpy,
            Boolean(card.stock),
            raw,
          ],
        );
        supported += 1;
      }
    }

    await connection.query(
      "UPDATE `CardImportRun` SET `status` = 'COMPLETED', `imported` = ?, `supported` = ?, `skipped` = ?, `setCount` = ?, `message` = ?, `finishedAt` = NOW() WHERE `id` = ?",
      [imported, supported, skipped, Object.keys(payload).length, `นำเข้า ${imported.toLocaleString("th-TH")} รายการ / รองรับ marketplace ${supported.toLocaleString("th-TH")} รายการ`, runId],
    );

    console.log(`นำเข้าข้อมูลการ์ดจาก data-cardgame.com แล้ว ${imported.toLocaleString("th-TH")} รายการ, รองรับ marketplace ${supported.toLocaleString("th-TH")} รายการ, ข้าม ${skipped.toLocaleString("th-TH")} รายการ`);
  } catch (error) {
    if (runId) {
      await connection.query("UPDATE `CardImportRun` SET `status` = 'FAILED', `message` = ?, `finishedAt` = NOW() WHERE `id` = ?", [
        error instanceof Error ? error.message : "sync คลังการ์ดไม่สำเร็จ",
        runId,
      ]);
    }
    throw error;
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
