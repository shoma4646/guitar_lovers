/**
 * カラーパレット（ライトテーマのみ）
 *
 * 値の正本は `tokens.js`。このファイルは型を付けて再エクスポートし、
 * 既存コードが使っている短名トークンをエイリアスとして残す。
 */

import { colors as tokens } from "./tokens";

export const colors = {
  ...tokens,

  // ===== 既存コード互換エイリアス =====

  /** @deprecated 新コードでは `surfaceContainerLowest` を使う */
  surfaceCard: tokens.surfaceContainerLowest,
  /** @deprecated 新コードでは `surfaceContainerLow` を使う */
  surfaceMuted: tokens.surfaceContainerLow,
  /** @deprecated 新コードでは `inverseSurface` を使う */
  surfaceDark: tokens.inverseSurface,

  /** @deprecated 新コードでは `primary` を使う */
  brand: tokens.primary,
  /** @deprecated 新コードでは `primaryContainer` を使う */
  brandSoft: tokens.primaryContainer,
  /** @deprecated 新コードでは `onPrimaryContainer` を使う */
  brandStrong: tokens.onPrimaryContainer,

  /** @deprecated 新コードでは `onSurface` を使う */
  textPrimary: tokens.onSurface,
  /** @deprecated 新コードでは `onSurfaceVariant` を使う */
  textMuted: tokens.onSurfaceVariant,
  /** @deprecated 新コードでは `onPrimary` を使う */
  textOnBrand: tokens.onPrimary,
  /** @deprecated 新コードでは `inverseOnSurface` を使う */
  textOnDark: tokens.inverseOnSurface,

  /** @deprecated 新コードでは `outlineVariant` を使う */
  border: tokens.outlineVariant,

  // ===== Phase A 旧互換 =====

  /** @deprecated 新コードでは `surface` を使う */
  bgDark: tokens.surface,
  /** @deprecated 新コードでは `surfaceContainerLowest` を使う */
  bgLightDark: tokens.surfaceContainerLowest,
  /** @deprecated 新コードでは `surfaceContainerLow` を使う */
  bgGray: tokens.surfaceContainerLow,
  /** @deprecated 新コードでは `onSurface` または `onPrimary` を使う */
  textWhite: tokens.onSurface,
  /** @deprecated 新コードでは `onSurfaceVariant` を使う */
  textGray: tokens.onSurfaceVariant,
  /** @deprecated 新コードでは `success` を使う */
  tuned: tokens.success,
  /** @deprecated フラット表示は `info` を使う */
  flat: tokens.info,
  /** @deprecated シャープ表示は `danger` を使う */
  sharp: tokens.danger,
} as const;

export type ColorKey = keyof typeof colors;
