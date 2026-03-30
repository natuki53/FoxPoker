import { prisma } from "@/lib/prisma";
import { MASTER_PREFECTURES } from "@/lib/master-prefectures-data";

/** master_prefectures が空のとき、初回アクセスでマスタを投入する（seed 未実行環境向け） */
export async function ensureMasterPrefectures(): Promise<void> {
  const n = await prisma.prefecture.count();
  if (n > 0) return;
  for (const pref of MASTER_PREFECTURES) {
    await prisma.prefecture.upsert({
      where: { code: pref.code },
      update: { ...pref },
      create: { ...pref },
    });
  }
}
