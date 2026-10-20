/** 秒数を mm:ss 形式にフォーマットする（小数秒は切り捨てる） */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
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
