/**
 * 「今日の目標」と当日の達成状況の計算
 *
 * 今日の記録も含めてresolveCurrentBpm/computeTodayTargetBpmを呼ぶと、今日ok記録を残すたびに
 * 目標が前進し、達成判定や表示中の目標値がその日のうちに後退・変動してしまう。
 * 「今日始める前に提示されていた目標」を1日を通して安定させるため、必ず当日の記録を除いた
 * attemptsから目標を計算する（progression.tsの公開関数のみを使い、ロジック自体は変更しない）。
 */

import { computeTodayTargetBpm, getLatestAttempt, resolveCurrentBpm } from "./progression";
import { isSameLocalDay } from "@/features/reminder/lib/reminderTime";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

/** フレーズの「今日の記録を除いた目標」と、その目標に対する当日の達成状況 */
export type TodayProgress = {
  /** 今日始める前に提示されていた目標BPM（当日の記録を除いて計算するため1日を通して変わらない） */
  targetBeforeToday: number;
  /** 当日のok記録のうち最大のBPM（無ければundefined） */
  todayBestOkBpm: number | undefined;
  /** todayBestOkBpmがtargetBeforeToday以上なら達成 */
  reached: boolean;
};

/**
 * フレーズの当日の目標達成状況を計算する
 * @param phrase - 対象フレーズ（currentBpm・targetBpmを使う）
 * @param attempts - 対象フレーズの練習結果一覧（順不同で可）
 * @param now - 判定基準の現在日時
 */
export function resolveTodayProgress(
  phrase: Pick<PracticePhrase, "currentBpm" | "targetBpm" | "initialBpm">,
  attempts: PhraseAttempt[],
  now: Date,
): TodayProgress {
  const attemptsBeforeToday = attempts.filter((a) => !isSameLocalDay(new Date(a.date), now));
  // phrase.currentBpmは当日のok記録で既に書き換わるため、起点にすると当日の結果が混入する。
  // 当日より前のok記録があればそれだけから再構築し、無いときだけ保存時のBPMへ退避する
  // （initialBpmを持たない既存データでも当日分が混ざらないようにする）
  const okBpmsBeforeToday = attemptsBeforeToday
    .filter((a) => a.result === "ok")
    .map((a) => a.bpm);
  const currentBpmBeforeToday =
    okBpmsBeforeToday.length > 0
      ? Math.max(...okBpmsBeforeToday)
      : resolveCurrentBpm(phrase.initialBpm ?? phrase.currentBpm, attemptsBeforeToday);
  const targetBeforeToday = computeTodayTargetBpm(
    currentBpmBeforeToday,
    getLatestAttempt(attemptsBeforeToday),
    phrase.targetBpm,
  );

  const todayOkBpms = attempts
    .filter((a) => a.result === "ok" && isSameLocalDay(new Date(a.date), now))
    .map((a) => a.bpm);
  const todayBestOkBpm = todayOkBpms.length > 0 ? Math.max(...todayOkBpms) : undefined;

  return {
    targetBeforeToday,
    todayBestOkBpm,
    reached: todayBestOkBpm !== undefined && todayBestOkBpm >= targetBeforeToday,
  };
}
