/** 秒数を mm:ss 形式にフォーマットする */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** カテゴリ表示名マッピング */
export const CATEGORY_LABELS: Record<string, string> = {
  chord: "コード",
  scale: "スケール",
  fingerpicking: "フィンガーピッキング",
  strumming: "ストローク",
  technique: "テクニック",
};
