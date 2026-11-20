/**
 * テスト用: 押せる要素のタップ領域（本体＋hitSlop）の下限を style と hitSlop から計算する
 *
 * 本体に高さ・幅の指定がなければ、中の文字の fontSize を本体の大きさの下限とみなす
 * （1行の文字は fontSize より低くならないため、実機の値以下の見積もりになる）。
 */

import { StyleSheet, Text, type Insets, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

/** RNTL のクエリが返す要素のうち、ここで使う部分だけ */
type TestElement = {
  type: unknown;
  props: Record<string, unknown>;
  findAll: (predicate: (node: TestElement) => boolean) => TestElement[];
};

/** タップ領域の最小値（Apple HIG の44pt） */
export const MIN_TOUCH_TARGET = 44;

function largestFontSize(element: TestElement): number {
  const texts = element.findAll((node) => node.type === Text || node.type === "Text");
  return Math.max(0, ...texts.map((node) => StyleSheet.flatten(node.props.style as StyleProp<TextStyle>)?.fontSize ?? 0));
}

function normalizeHitSlop(hitSlop: number | Insets | null | undefined): Required<Insets> {
  if (typeof hitSlop === "number") return { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop };
  return { top: hitSlop?.top ?? 0, bottom: hitSlop?.bottom ?? 0, left: hitSlop?.left ?? 0, right: hitSlop?.right ?? 0 };
}

/** 押せる要素のタップ領域の縦横の下限を返す */
export function minTouchTargetSize(element: TestElement): { width: number; height: number } {
  const style = StyleSheet.flatten(element.props.style as StyleProp<ViewStyle>) ?? {};
  const contentFloor = largestFontSize(element);
  const bodySize = (fixed: unknown, min: unknown) =>
    typeof fixed === "number" ? fixed : typeof min === "number" ? Math.max(min, contentFloor) : contentFloor;
  const slop = normalizeHitSlop(element.props.hitSlop as number | Insets | undefined);

  return {
    width: bodySize(style.width, style.minWidth) + slop.left + slop.right,
    height: bodySize(style.height, style.minHeight) + slop.top + slop.bottom,
  };
}
