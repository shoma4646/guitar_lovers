/**
 * カラーパレット（ライトテーマのみ）
 *
 * 値の正本は `tokens.js`。このファイルは型を付けて再エクスポートするだけ。
 */

import { colors as tokens } from "./tokens";

export const colors = tokens;

export type ColorKey = keyof typeof colors;
