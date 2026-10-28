import { diffLocalDays } from "@/shared/lib/localDay";

/** 動画を開いた・追加した日時を `now` と端末ローカルの暦日で比べ、「今日」「昨日」「N日前」等を返す。解釈できない日時は空文字 */
export function formatRelativeVideoDate(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const days = diffLocalDays(date, now);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}
