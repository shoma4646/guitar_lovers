/**
 * 色トークンの正本
 *
 * TypeScript 側（`colors.ts`）と Tailwind 側（`tailwind.config.js`）の両方がこのファイルを読む。
 * `tailwind.config.js` は Node が直接評価するため TS を読めず、ここだけ CommonJS にしている。
 */

/** Material Design 3 風の色トークン（ライトテーマのみ） */
const colors = {
  // ===== Surface（背景階調） =====
  surface: "#fff8f7",
  surfaceDim: "#edd5d1",
  surfaceBright: "#fff8f7",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#fff0ee",
  surfaceContainer: "#ffe9e6",
  surfaceContainerHigh: "#fce3df",
  surfaceContainerHighest: "#f6ddda",
  inverseSurface: "#3c2d2b",
  inverseOnSurface: "#ffedea",
  surfaceTint: "#ae3026",
  surfaceVariant: "#f6ddda",

  // ===== On Surface（テキスト・前景） =====
  onSurface: "#251817",
  onSurfaceVariant: "#59413e",
  background: "#fff8f7",
  onBackground: "#251817",

  // ===== Primary =====
  primary: "#ae3026",
  onPrimary: "#ffffff",
  primaryContainer: "#ff6b5b",
  onPrimaryContainer: "#6d0003",
  inversePrimary: "#ffb4aa",
  primaryFixed: "#ffdad5",
  primaryFixedDim: "#ffb4aa",
  onPrimaryFixed: "#410001",
  onPrimaryFixedVariant: "#8c1712",

  // ===== Secondary（Amber / 進捗・ストリーク） =====
  secondary: "#855300",
  onSecondary: "#ffffff",
  secondaryContainer: "#fea619",
  onSecondaryContainer: "#684000",
  secondaryFixed: "#ffddb8",
  secondaryFixedDim: "#ffb95f",
  onSecondaryFixed: "#2a1700",
  onSecondaryFixedVariant: "#653e00",

  // ===== Tertiary =====
  tertiary: "#006b57",
  onTertiary: "#ffffff",
  tertiaryContainer: "#00af8f",
  onTertiaryContainer: "#003a2e",
  tertiaryFixed: "#74f9d5",
  tertiaryFixedDim: "#54dcba",
  onTertiaryFixed: "#002019",
  onTertiaryFixedVariant: "#005141",

  // ===== Error =====
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  // ===== Outline（罫線） =====
  outline: "#8c716d",
  outlineVariant: "#e0bfba",

  // ===== ステータス =====
  success: "#10B981",
  danger: "#ba1a1a",
  info: "#2979FF",
};

/**
 * camelCase のトークンを Tailwind 用の kebab-case へ変換する
 * @param {Record<string, string>} source 色トークン
 * @returns {Record<string, string>} kebab-case のキーを持つ色トークン
 */
function toKebabColors(source) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
      value,
    ]),
  );
}

module.exports = { colors, toKebabColors };
