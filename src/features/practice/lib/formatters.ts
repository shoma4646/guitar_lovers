/** 秒数を mm:ss 形式にフォーマットする（小数秒は切り捨てる） */
export function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 秒数を読み上げ用の「1分12秒」形式にする（小数秒は切り捨てる） */
export function formatSpokenDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}秒`;
  return s === 0 ? `${m}分` : `${m}分${s}秒`;
}

/** カテゴリ表示名マッピング */
export const CATEGORY_LABELS: Record<string, string> = {
  chord: "コード",
  scale: "スケール",
  fingerpicking: "フィンガーピッキング",
  strumming: "ストローク",
  technique: "テクニック",
};
