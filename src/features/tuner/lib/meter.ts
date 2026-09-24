/**
 * チューニングメーターの表示ロジック
 *
 * セント値からメーター描画用の割合・チューニング状態・文言を導出する純関数群。
 * TunerScreen / NeedleMeter はここを参照して表示する。
 */

import { TUNING_THRESHOLD_CENTS } from "@/shared/constants/tuning";

/** 針メーターが表示する範囲（±このセント数で振り切れる） */
export const METER_MAX_CENTS = 50;

/** セント値をメーター表示用の割合に変換する（-50〜+50 → 0〜1）。範囲外は0または1に丸める */
export function centsToMeterRatio(cents: number): number {
  return Math.max(0, Math.min(1, (cents + METER_MAX_CENTS) / (METER_MAX_CENTS * 2)));
}

export type TuningState = "in" | "flat" | "sharp";

/** セント値からチューニング状態を判定する（低い=flat、高い=sharp） */
export function tuningState(cents: number): TuningState {
  if (Math.abs(cents) <= TUNING_THRESHOLD_CENTS) return "in";
  return cents < 0 ? "flat" : "sharp";
}

/** 状態バッジ・読み上げ用の文言を返す。stringLabelを渡すと弦名を前置きする */
export function describeTuning(state: TuningState, stringLabel?: string): string {
  const prefix = stringLabel ? `${stringLabel}: ` : "";
  switch (state) {
    case "in":
      return `${prefix}合っています`;
    case "flat":
      return `${prefix}低い・少し締める`;
    case "sharp":
      return `${prefix}高い・少し緩める`;
  }
}
