/**
 * フレーズ別BPM推移サマリの集計フック
 *
 * 進捗タブの複数コンポーネント（画面本体・全件シート）が同じ集計結果を必要とするため、
 * フレーズ・練習結果の取得と `splitPhraseProgress` の適用をここに一本化する。
 */

import { useMemo } from "react";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { splitPhraseProgress, type PhraseProgressSplit } from "@/features/progress/lib/phraseProgress";

type Result = PhraseProgressSplit & { isLoading: boolean };

export function usePhraseProgressSummaries(): Result {
  const { data: phrases, isLoading: isLoadingPhrases } = usePracticePhrases();
  const { data: attempts, isLoading: isLoadingAttempts } = usePhraseAttempts();

  const { inProgress, graduated } = useMemo<PhraseProgressSplit>(
    () => (phrases ? splitPhraseProgress(phrases, attempts ?? []) : { inProgress: [], graduated: [] }),
    [phrases, attempts],
  );

  return { inProgress, graduated, isLoading: isLoadingPhrases || isLoadingAttempts };
}
