/** トーナメント・店舗ゲーム用ゲームタイプマスタ（seed で投入） */
export const MASTER_GAME_TYPES = [
  {
    name: "ノーウリミットホールデム",
    abbreviation: "NLH",
    description: "テキサスホールデム（ノーウリミット）",
    sortOrder: 0,
    isActive: true,
  },
  {
    name: "ポットリミットオマハ",
    abbreviation: "PLO",
    description: "4枚ホールカードのポットリミットオマハ",
    sortOrder: 10,
    isActive: true,
  },
  {
    name: "オマハハイロー",
    abbreviation: "PLO8",
    description: "ポットリミットオマハ ハイ/ロー",
    sortOrder: 20,
    isActive: true,
  },
  {
    name: "ショートデッキホールデム",
    abbreviation: "Short Deck",
    description: "36枚デッキ（2〜5抜き）ホールデム",
    sortOrder: 30,
    isActive: true,
  },
  {
    name: "リミットホールデム",
    abbreviation: "FLH",
    description: "テキサスホールデム（フィックスドリミット）",
    sortOrder: 40,
    isActive: true,
  },
  {
    name: "その他",
    abbreviation: "Other",
    description: "上記以外・ミックスなど",
    sortOrder: 100,
    isActive: true,
  },
] as const;
