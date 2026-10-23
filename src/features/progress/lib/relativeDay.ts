import { toDayKey } from "@/features/progress/lib/calcStats";
import { formatDateShort } from "@/features/progress/lib/formatters";

/** 記録日時を `now` と端末ローカルの暦日で比べ、「今日」「昨日」または "M/D" を返す */
export function formatRelativeDay(iso: string, now: Date): string {
  const dayKey = toDayKey(new Date(iso));
  if (dayKey === toDayKey(now)) return "今日";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey === toDayKey(yesterday)) return "昨日";
  return formatDateShort(iso);
}
