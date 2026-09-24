/**
 * フレーズ別BPM推移サマリの集計フック
 *
 * 進捗タブの複数コンポーネント（画面本体・全件シート）が同じ集計結果を必要とするため、
 * フレーズ・練習結果の取得と `summarizePhraseProgress` の適用をここに一本化する。
 */

import { useMemo } from "react";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { summarizePhraseProgress, type PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";

/** 卒業済みフレーズのサマリ（graduatedAtが確定している） */
export type GraduatedPhraseSummary = PhraseProgressSummary & { graduatedAt: string };

type Result = {
  /** 練習中フレーズ（更新日時の新しい順） */
  inProgress: PhraseProgressSummary[];
  /** 卒業したフレーズ（卒業日の新しい順） */
  graduated: GraduatedPhraseSummary[];
  isLoading: boolean;
};

export function usePhraseProgressSummaries(): Result {
  const { data: phrases, isLoading: isLoadingPhrases } = usePracticePhrases();
  const { data: attempts, isLoading: isLoadingAttempts } = usePhraseAttempts();

  const { inProgress, graduated } = useMemo(() => {
    if (!phrases) return { inProgress: [], graduated: [] as GraduatedPhraseSummary[] };

    const summaries = phrases
      .filter((phrase) => !phrase.archivedAt)
      .map((phrase) =>
        summarizePhraseProgress(
          phrase,
          (attempts ?? []).filter((a) => a.phraseId === phrase.id),
        ),
      );

    const inProgress = summaries
      .filter((summary) => !summary.graduatedAt)
      .sort(
        (a, b) => new Date(b.phrase.updatedAt).getTime() - new Date(a.phrase.updatedAt).getTime(),
      );

    const graduated = summaries
      .flatMap((summary) =>
        summary.graduatedAt ? [{ ...summary, graduatedAt: summary.graduatedAt }] : [],
      )
      .sort((a, b) => new Date(b.graduatedAt).getTime() - new Date(a.graduatedAt).getTime());

    return { inProgress, graduated };
  }, [phrases, attempts]);

  return { inProgress, graduated, isLoading: isLoadingPhrases || isLoadingAttempts };
}
