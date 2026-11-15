import { useMemo } from "react";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { buildTodayMenu, type TodayMenuEntry } from "@/features/practice/lib/progression";
import { useLocalDay } from "@/shared/hooks/useLocalDay";
import { localDayToDate } from "@/shared/lib/localDay";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

const NO_PHRASES: PracticePhrase[] = [];
const NO_ATTEMPTS: PhraseAttempt[] = [];

/**
 * 保存済みフレーズと練習結果から組んだ今日の練習メニューを返す
 * フレーズ・練習結果・端末ローカルの今日の暦日のどれかが変わったときだけ組み直す（読み込み前・失敗時は空として扱う）
 */
export function useTodayMenu(): TodayMenuEntry[] {
  const { data: phrases } = usePracticePhrases();
  const { data: attempts } = usePhraseAttempts();
  const localDay = useLocalDay();
  return useMemo(
    () => buildTodayMenu(phrases ?? NO_PHRASES, attempts ?? NO_ATTEMPTS, localDayToDate(localDay)),
    [phrases, attempts, localDay],
  );
}
