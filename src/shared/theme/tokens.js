/**
 * 色トークンの正本
 *
 * TypeScript 側（`colors.ts`）と Tailwind 側（`tailwind.config.js`）の両方がこのファイルを読む。
 * `tailwind.config.js` は Node が直接評価するため TS を読めず、ここだけ CommonJS にしている。
 */

/** Material Design 3 風の色トークン（ライトテーマのみ） */
const colors = {
  // ===== Surface（背景階調） =====
  surface: "#f5f8f4",
  surfaceDim: "#d7e0d6",
  surfaceBright: "#f5f8f4",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#eef3ed",
  surfaceContainer: "#e6eee6",
  surfaceContainerHigh: "#dbe5da",
  surfaceContainerHighest: "#d3ded2",
  inverseSurface: "#1f2a22",
  inverseOnSurface: "#eef5ee",
  surfaceTint: "#2e6b3f",
  surfaceVariant: "#dbe5da",

  // ===== On Surface（テキスト・前景） =====
  onSurface: "#172019",
  onSurfaceVariant: "#4f5c52",
  background: "#f5f8f4",
  onBackground: "#172019",

  // ===== Primary =====
  primary: "#2e6b3f",
  onPrimary: "#ffffff",
  primaryContainer: "#7cc08a",
  onPrimaryContainer: "#06240f",
  inversePrimary: "#a5d6ae",
  primaryFixed: "#d3ecd6",
  primaryFixedDim: "#a5d6ae",
  onPrimaryFixed: "#06240f",
  onPrimaryFixedVariant: "#1c4a29",

  // ===== Secondary（Amber / 進捗・ストリーク） =====
  secondary: "#855300",
  onSecondary: "#ffffff",
  secondaryContainer: "#fea619",
  onSecondaryContainer: "#684000",
  secondaryFixed: "#ffddb8",
  secondaryFixedDim: "#ffb95f",
  onSecondaryFixed: "#2a1700",
  onSecondaryFixedVariant: "#653e00",


  // ===== Error =====
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  // ===== Outline（罫線） =====
  outline: "#75857a",
  outlineVariant: "#c6d3c5",
  /** 一覧の区切り線 */
  divider: "#e2eae1",

  // ===== ステータス =====
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
