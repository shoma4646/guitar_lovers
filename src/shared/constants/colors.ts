/**
 * アプリ全体で使用するカラーパレット定義
 * ダークテーマをベースとしたギターアプリ向けカラースキーム
 */

export const colors = {
  /** メインの背景色 - 最も暗い */
  bgDark: "#0B0F19",
  /** セカンダリ背景色 - カード・パネル用 */
  bgLightDark: "#151A26",
  /** グレー背景 - 入力フィールド・区切り用 */
  bgGray: "#2A3040",

  /** プライマリカラー - アクセント・ボタン */
  primary: "#6C63FF",
  /** セカンダリカラー - ハイライト・強調 */
  secondary: "#00E5FF",
  /** エラーカラー - 警告・削除 */
  error: "#FF5252",

  /** メインテキスト - 白 */
  textWhite: "#FFFFFF",
  /** サブテキスト - グレー */
  textGray: "#8F9BB3",

  /** チューニング完了 - 緑 */
  tuned: "#00C853",
  /** フラット方向 - 青 */
  flat: "#2979FF",
  /** シャープ方向 - 赤 */
  sharp: "#FF5252",
} as const;

export type ColorKey = keyof typeof colors;
