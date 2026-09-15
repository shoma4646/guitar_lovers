import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { BPM_MAX } from "@/shared/constants/bpm";

/** 1回の成功で引き上げる目標BPMの幅 */
const BPM_STEP = 5;

/**
 * 練習結果一覧から最新の1件を返す（dateで降順比較）
 * @param attempts - 対象フレーズの練習結果一覧
 */
export function getLatestAttempt(
  attempts: PhraseAttempt[],
): PhraseAttempt | undefined {
  if (attempts.length === 0) return undefined;
  return [...attempts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
}

/**
 * 記録を加味した到達BPMを返す
 *
 * 結果の保存と到達BPMの更新は別々の書き込みなので、記録だけ残って到達BPMが
 * 未更新の状態がありうる。「弾けた」記録の最大BPMと保存済みの到達BPMの大きい方を採る
 * @param currentBpm - フレーズに保存されている到達BPM
 * @param attempts - 対象フレーズの練習結果一覧
 */
export function resolveCurrentBpm(
  currentBpm: number,
  attempts: PhraseAttempt[],
): number {
  return attempts.reduce(
    (max, attempt) =>
      attempt.result === "ok" && attempt.bpm > max ? attempt.bpm : max,
    currentBpm,
  );
}

/**
 * 今日の目標BPMを計算する
 *
 * 直近の結果が到達BPM以上のテンポで「弾けた（ok）」なら到達BPMから+5。
 * それ以外（あやしい・弾けなかった・到達BPMより遅いテンポでの成功・記録なし）は据え置く。
 * 上限はフレーズの目標BPM（既に超えていれば到達BPM）とメトロノーム上限のいずれか低い方。
 * @param currentBpm - フレーズの現在の到達BPM
 * @param latestAttempt - 直近の練習結果（無ければundefined）
 * @param targetBpm - フレーズの目標BPM
 */
export function computeTodayTargetBpm(
  currentBpm: number,
  latestAttempt: PhraseAttempt | undefined,
  targetBpm: number,
): number {
  const clearedAtCurrentTempo =
    latestAttempt?.result === "ok" && latestAttempt.bpm >= currentBpm;
  if (!clearedAtCurrentTempo) {
    return currentBpm;
  }
  return Math.min(currentBpm + BPM_STEP, Math.max(targetBpm, currentBpm), BPM_MAX);
}

/**
 * 到達BPMが目標BPM以上なら卒業とみなす
 * @param resolvedCurrentBpm - resolveCurrentBpmで記録を加味した到達BPM
 * @param targetBpm - フレーズの目標BPM
 */
export function isGraduated(resolvedCurrentBpm: number, targetBpm: number): boolean {
  return resolvedCurrentBpm >= targetBpm;
}

/**
 * 卒業していればその日時を返し、未卒業ならundefinedを返す
 *
 * 日時は graduatedAt → 目標BPM以上で弾けた最初の記録 → createdAt の順に採る。
 * 目標BPMを引き上げて未到達になった場合は graduatedAt が残っていても undefined を返す
 * @param phrase - 対象フレーズ
 * @param attempts - 対象フレーズの練習結果一覧（順不同で可）
 */
export function resolveGraduatedAt(
  phrase: Pick<PracticePhrase, "currentBpm" | "targetBpm" | "graduatedAt" | "createdAt">,
  attempts: PhraseAttempt[],
): string | undefined {
  if (!isGraduated(resolveCurrentBpm(phrase.currentBpm, attempts), phrase.targetBpm)) {
    return undefined;
  }
  if (phrase.graduatedAt) return phrase.graduatedAt;
  const firstReached = attempts
    .filter((a) => a.result === "ok" && a.bpm >= phrase.targetBpm)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  return firstReached?.date ?? phrase.createdAt;
}
