/**
 * アニメーションの時間とイージング
 *
 * reduce motion のときは再生を止めるのではなく duration 0 で最終値へ飛ばす。
 * 止めてしまうと進捗バーが0のまま残るなど、情報が欠ける。
 */

import { Easing } from "react-native-reanimated";

/** アニメーションの長さ（ミリ秒） */
export const DURATION = {
  instant: 0,
  fast: 120,
  normal: 260,
  slow: 400,
} as const;

export type DurationKey = keyof typeof DURATION;

/** イージング。standard=汎用、decelerate=出現、accelerate=退出 */
export const EASING = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;

/**
 * reduce motion を加味した duration を返す
 * @param reduced - useReducedMotion() の値
 * @param key - DURATION のキー
 */
export function ms(reduced: boolean, key: DurationKey): number {
  return reduced ? 0 : DURATION[key];
}
