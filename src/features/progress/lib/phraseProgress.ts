import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import {
  resolveCurrentBpm,
  resolveGraduatedAt,
} from "@/features/practice/lib/progression";

/** フレーズ1件分のBPM推移サマリ */
export interface PhraseProgressSummary {
  phrase: PracticePhrase;
  /** 保存時のBPM。initialBpmが無い既存フレーズは最初の練習結果のBPM、それも無ければ現在BPMで補う */
  startBpm: number;
  /** 現在の到達BPM */
  currentBpm: number;
  /** 目標BPM */
  targetBpm: number;
  /** 開始BPMから目標BPMまでの達成率（0〜1に正規化） */
  progressRatio: number;
  /**
   * 開始BPMから現在BPMまでの上昇幅（0未満にはしない）
   * initialBpmが無く開始BPMを補完した場合はundefined（補完値は本物の保存時BPMより高いことがあり、上昇幅が実態より小さく見えるため）
   */
  gainBpm: number | undefined;
  /** 卒業日時。未卒業ならundefined */
  graduatedAt: string | undefined;
}

/**
 * フレーズと関連する練習結果からBPM推移サマリを計算する
 * @param phrase - 対象フレーズ
 * @param attempts - 対象フレーズの練習結果一覧（順不同で可）
 */
export function summarizePhraseProgress(
  phrase: PracticePhrase,
  attempts: PhraseAttempt[],
): PhraseProgressSummary {
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const hasReliableStartBpm = phrase.initialBpm !== undefined;
  const startBpm = phrase.initialBpm ?? sorted[0]?.bpm ?? phrase.currentBpm;
  const currentBpm = resolveCurrentBpm(phrase.currentBpm, attempts);
  const targetBpm = phrase.targetBpm;
  const span = targetBpm - startBpm;
  const progressRatio =
    span <= 0
      ? currentBpm >= targetBpm
        ? 1
        : 0
      : clamp((currentBpm - startBpm) / span, 0, 1);

  return {
    phrase,
    startBpm,
    currentBpm,
    targetBpm,
    progressRatio,
    gainBpm: hasReliableStartBpm ? Math.max(0, currentBpm - startBpm) : undefined,
    graduatedAt: resolveGraduatedAt(phrase, attempts),
  };
}

/** 卒業済みフレーズのサマリ（graduatedAtが確定している） */
export type GraduatedPhraseSummary = PhraseProgressSummary & { graduatedAt: string };

/** 進捗タブに出すフレーズの振り分け結果 */
export interface PhraseProgressSplit {
  /** 練習中フレーズ（更新日時の新しい順） */
  inProgress: PhraseProgressSummary[];
  /** 卒業したフレーズ（卒業日の新しい順） */
  graduated: GraduatedPhraseSummary[];
}

/**
 * アーカイブ済みを除いたフレーズのサマリを、練習中と卒業に振り分けて並べる
 * @param phrases - 全フレーズ
 * @param attempts - 全フレーズの練習結果（フレーズごとに絞り込んでから集計する）
 */
export function splitPhraseProgress(
  phrases: PracticePhrase[],
  attempts: PhraseAttempt[],
): PhraseProgressSplit {
  const summaries = phrases
    .filter((phrase) => !phrase.archivedAt)
    .map((phrase) =>
      summarizePhraseProgress(
        phrase,
        attempts.filter((a) => a.phraseId === phrase.id),
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
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
