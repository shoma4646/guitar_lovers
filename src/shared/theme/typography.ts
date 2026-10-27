/**
 * タイポグラフィトークン
 *
 * Stitch DESIGN.md（modern_guitarist）の Inter ベース体系を採用。
 * - `display-numeric` は Tuner / Metronome 等の高利用度数値表示用（heavy weight + tight tracking）
 * - 旧 fontSize エイリアスは互換のため残す
 */

/** Inter フォントファミリー（expo-font で読み込む登録名） */
export const fontFamily = {
  /** 通常テキスト */
  inter: "Inter",
  /** 数値表示専用（tabular lining figures 想定） */
  interTabular: "Inter",
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

/**
 * Stitch タイポグラフィ階段（fontSize / lineHeight / letterSpacing / weight をまとめる）
 *
 * RN の Text で使う場合は spread で展開:
 *   <Text style={textStyles.headlineLg}>...</Text>
 */
export const textStyles = {
  /** 64px / 800 — Tuner などのノート表示 */
  displayNumeric: {
    fontFamily: fontFamily.interTabular,
    fontSize: 64,
    fontWeight: "800" as const,
    lineHeight: 64,
    letterSpacing: -2.56, // -0.04em × 64
  },
  /** 32px / 700 — 画面タイトル */
  headlineXl: {
    fontFamily: fontFamily.inter,
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 38.4, // 1.2
    letterSpacing: -0.64, // -0.02em × 32
  },
  /** 24px / 700 — セクション見出し */
  headlineLg: {
    fontFamily: fontFamily.inter,
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 31.2, // 1.3
    letterSpacing: 0,
  },
  /** 18px / 400 — 強調本文 */
  bodyLg: {
    fontFamily: fontFamily.inter,
    fontSize: 18,
    fontWeight: "400" as const,
    lineHeight: 27, // 1.5
    letterSpacing: 0,
  },
  /** 16px / 400 — 本文 */
  bodyMd: {
    fontFamily: fontFamily.inter,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24, // 1.5
    letterSpacing: 0,
  },
  /** 13px / 600 — 1行の小ラベル・タブラベル（行の高さ=文字サイズのため折り返す文には使わない） */
  labelSm: {
    fontFamily: fontFamily.inter,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 13, // 1
    letterSpacing: 0.26, // 0.02em × 13
  },
  /** 13px / 400 — 折り返しうる補足・説明文 */
  caption: {
    fontFamily: fontFamily.inter,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const;

export type TextStyleKey = keyof typeof textStyles;

// ===== 旧 fontSize / fontWeight エイリアス（互換維持） =====

/**
 * @deprecated Stitch トークンを使う場合は `textStyles` を参照する。
 * 既存 StyleSheet で `fontSize: fontSize.body` のような利用が残っているため保持。
 */
export const fontSize = {
  micro: 10,
  caption: 11,
  bodyXs: 12,
  bodySm: 13,
  body: 14,
  bodyLg: 15,
  headingSm: 16,
  headingMd: 18,
  headingLg: 20,
  titleSm: 24,
  titleMd: 28,
  displaySm: 40,
  display: 72,
} as const;

/**
 * @deprecated Stitch トークンを使う場合は `textStyles` の weight を参照する。
 */
export const fontWeight = {
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
