/**
 * 意味トークン
 *
 * 画面コードはこちらを参照し、生の `colors` はプリミティブ部品だけが触る。
 * primary が緑になるとチューナーの「合っている」緑とボタンの緑が同じ色になるため、
 * 後から意味ごとに色を分けられるよう1段挟んでいる。
 */

import { colors } from "./colors";

export const semantic = {
  /** チューニングが合っている */
  tunerInTune: colors.primary,
  /** チューニングがずれている */
  tunerOff: colors.error,
  /** 音が検出できていない */
  tunerIdle: colors.onSurfaceVariant,

  /** 卒業したフレーズ（金） */
  graduated: colors.secondary,
  /** 卒業バッジの背景 */
  graduatedContainer: colors.secondaryFixed,
  /** 連続日数 */
  streak: colors.secondary,

  /** 進捗バーの土台 */
  progressTrack: colors.outlineVariant,
  /** 進捗バーの塗り */
  progressFill: colors.primary,
  /** 目標地点のマーカー */
  progressGoal: colors.primaryContainer,

  /** 週バー: 練習した日 */
  weekDone: colors.primary,
  /** 週バー: 練習していない日 */
  weekTodo: colors.surfaceContainerHigh,

  /** 練習中バーの背景 */
  sessionBarSurface: colors.inverseSurface,
  /** 練習中バーの文字 */
  sessionBarOn: colors.inverseOnSurface,
  /** 練習中バーの強調 */
  sessionBarAccent: colors.inversePrimary,
} as const;

export type SemanticKey = keyof typeof semantic;
