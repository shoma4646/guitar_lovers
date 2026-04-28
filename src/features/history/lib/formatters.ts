/** 秒数を "h時間m分" 形式にフォーマットする */
export function formatDurationLong(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}時間` : `${h}時間${rem}分`;
}

/** 秒数を mm:ss 形式にフォーマットする */
export function formatDurationShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** ISO日付文字列から "MM/DD" 形式を生成する */
export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
