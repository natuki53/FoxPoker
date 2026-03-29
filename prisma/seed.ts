import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const PREFECTURES = [
  { code: "01", name: "北海道", nameKana: "ホッカイドウ", region: "北海道", slug: "hokkaido" },
  { code: "02", name: "青森県", nameKana: "アオモリケン", region: "東北", slug: "aomori" },
  { code: "03", name: "岩手県", nameKana: "イワテケン", region: "東北", slug: "iwate" },
  { code: "04", name: "宮城県", nameKana: "ミヤギケン", region: "東北", slug: "miyagi" },
  { code: "05", name: "秋田県", nameKana: "アキタケン", region: "東北", slug: "akita" },
  { code: "06", name: "山形県", nameKana: "ヤマガタケン", region: "東北", slug: "yamagata" },
  { code: "07", name: "福島県", nameKana: "フクシマケン", region: "東北", slug: "fukushima" },
  { code: "08", name: "茨城県", nameKana: "イバラキケン", region: "関東", slug: "ibaraki" },
  { code: "09", name: "栃木県", nameKana: "トチギケン", region: "関東", slug: "tochigi" },
  { code: "10", name: "群馬県", nameKana: "グンマケン", region: "関東", slug: "gunma" },
  { code: "11", name: "埼玉県", nameKana: "サイタマケン", region: "関東", slug: "saitama" },
  { code: "12", name: "千葉県", nameKana: "チバケン", region: "関東", slug: "chiba" },
  { code: "13", name: "東京都", nameKana: "トウキョウト", region: "関東", slug: "tokyo" },
  { code: "14", name: "神奈川県", nameKana: "カナガワケン", region: "関東", slug: "kanagawa" },
  { code: "15", name: "新潟県", nameKana: "ニイガタケン", region: "中部", slug: "niigata" },
  { code: "16", name: "富山県", nameKana: "トヤマケン", region: "中部", slug: "toyama" },
  { code: "17", name: "石川県", nameKana: "イシカワケン", region: "中部", slug: "ishikawa" },
  { code: "18", name: "福井県", nameKana: "フクイケン", region: "中部", slug: "fukui" },
  { code: "19", name: "山梨県", nameKana: "ヤマナシケン", region: "中部", slug: "yamanashi" },
  { code: "20", name: "長野県", nameKana: "ナガノケン", region: "中部", slug: "nagano" },
  { code: "21", name: "岐阜県", nameKana: "ギフケン", region: "中部", slug: "gifu" },
  { code: "22", name: "静岡県", nameKana: "シズオカケン", region: "中部", slug: "shizuoka" },
  { code: "23", name: "愛知県", nameKana: "アイチケン", region: "中部", slug: "aichi" },
  { code: "24", name: "三重県", nameKana: "ミエケン", region: "近畿", slug: "mie" },
  { code: "25", name: "滋賀県", nameKana: "シガケン", region: "近畿", slug: "shiga" },
  { code: "26", name: "京都府", nameKana: "キョウトフ", region: "近畿", slug: "kyoto" },
  { code: "27", name: "大阪府", nameKana: "オオサカフ", region: "近畿", slug: "osaka" },
  { code: "28", name: "兵庫県", nameKana: "ヒョウゴケン", region: "近畿", slug: "hyogo" },
  { code: "29", name: "奈良県", nameKana: "ナラケン", region: "近畿", slug: "nara" },
  { code: "30", name: "和歌山県", nameKana: "ワカヤマケン", region: "近畿", slug: "wakayama" },
  { code: "31", name: "鳥取県", nameKana: "トットリケン", region: "中国", slug: "tottori" },
  { code: "32", name: "島根県", nameKana: "シマネケン", region: "中国", slug: "shimane" },
  { code: "33", name: "岡山県", nameKana: "オカヤマケン", region: "中国", slug: "okayama" },
  { code: "34", name: "広島県", nameKana: "ヒロシマケン", region: "中国", slug: "hiroshima" },
  { code: "35", name: "山口県", nameKana: "ヤマグチケン", region: "中国", slug: "yamaguchi" },
  { code: "36", name: "徳島県", nameKana: "トクシマケン", region: "四国", slug: "tokushima" },
  { code: "37", name: "香川県", nameKana: "カガワケン", region: "四国", slug: "kagawa" },
  { code: "38", name: "愛媛県", nameKana: "エヒメケン", region: "四国", slug: "ehime" },
  { code: "39", name: "高知県", nameKana: "コウチケン", region: "四国", slug: "kochi" },
  { code: "40", name: "福岡県", nameKana: "フクオカケン", region: "九州", slug: "fukuoka" },
  { code: "41", name: "佐賀県", nameKana: "サガケン", region: "九州", slug: "saga" },
  { code: "42", name: "長崎県", nameKana: "ナガサキケン", region: "九州", slug: "nagasaki" },
  { code: "43", name: "熊本県", nameKana: "クマモトケン", region: "九州", slug: "kumamoto" },
  { code: "44", name: "大分県", nameKana: "オオイタケン", region: "九州", slug: "oita" },
  { code: "45", name: "宮崎県", nameKana: "ミヤザキケン", region: "九州", slug: "miyazaki" },
  { code: "46", name: "鹿児島県", nameKana: "カゴシマケン", region: "九州", slug: "kagoshima" },
  { code: "47", name: "沖縄県", nameKana: "オキナワケン", region: "沖縄", slug: "okinawa" },
];

const LISTING_PLANS = [
  {
    name: "FREE",
    rank: 0,
    price1month: 0,
    price3months: 0,
    price6months: 0,
    price12months: 0,
    maxPhotos: 10,
    hasTournament: false,
    description: "店舗ページを無料・無期限で掲載。検索優先やトップのイベント枠などの強化露出は対象外",
    sortOrder: 0,
  },
  {
    name: "BASIC",
    rank: 1,
    price1month: 5000,
    price3months: 14250,
    price6months: 27000,
    price12months: 51000,
    maxPhotos: 10,
    hasTournament: true,
    description: "無料掲載に加え、検索・一覧での露出強化・トーナメント掲載など（プラン範囲に準じます）",
    sortOrder: 10,
  },
  {
    name: "PREMIUM",
    rank: 2,
    price1month: 12000,
    price3months: 34200,
    price6months: 64800,
    price12months: 122400,
    maxPhotos: 30,
    hasTournament: true,
    hasAnalyticsKeyword: true,
    maxSubAccounts: 2,
    description: "露出強化に加えトーナメント掲載など。検索・イベント枠の扱いはプラン範囲に準じます",
    sortOrder: 20,
  },
  {
    name: "PLATINUM",
    rank: 3,
    price1month: 25000,
    price3months: 71250,
    price6months: 135000,
    price12months: 255000,
    maxPhotos: 100,
    hasTournament: true,
    hasAnalyticsKeyword: true,
    hasAnalyticsCompetitor: true,
    maxSubAccounts: 10,
    description: "最も手厚い検索・イベント露出と拡張機能（プラン範囲に準じます）",
    sortOrder: 30,
  },
];

async function seedSystemAdmin() {
  const email = process.env.SYSTEM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SYSTEM_ADMIN_PASSWORD;
  const displayName = process.env.SYSTEM_ADMIN_NAME?.trim() || "System Admin";

  if (!email || !password) {
    console.log("Skipped system admin seed. Set SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD to enable.");
    return;
  }

  if (password.length < 8) {
    throw new Error("SYSTEM_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      passwordHash,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      displayName,
      passwordHash,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Seeded system admin account: ${email}`);
}

async function main() {
  console.log("Seeding prefectures...");

  for (const pref of PREFECTURES) {
    await prisma.prefecture.upsert({
      where: { code: pref.code },
      update: pref,
      create: pref,
    });
  }

  console.log(`Seeded ${PREFECTURES.length} prefectures.`);
  console.log("Seeding listing plans...");
  for (const plan of LISTING_PLANS) {
    const existing = await prisma.listingPlan.findFirst({
      where: { name: plan.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.listingPlan.update({
        where: { id: existing.id },
        data: plan,
      });
    } else {
      await prisma.listingPlan.create({ data: plan });
    }
  }
  console.log(`Upserted ${LISTING_PLANS.length} listing plans.`);

  await seedSystemAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
