/** 端末ローカルの暦日を表す "YYYY-MM-DD" 文字列 */
export type LocalDay = string;

/** 日時を端末ローカルの暦日 "YYYY-MM-DD" に変換する */
export function toLocalDay(date: Date): LocalDay {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 暦日 "YYYY-MM-DD" を、その日の端末ローカル正午の Date に戻す（暦日だけを使う計算の基準日時用） */
export function localDayToDate(day: LocalDay): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** `now` から次の端末ローカル 0:00 までのミリ秒 */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}
