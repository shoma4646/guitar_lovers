import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MAX_ONE_SCREEN_FONT_SCALE,
  MIN_ONE_SCREEN_BUDGET,
  TAB_BAR_CONTENT_HEIGHT,
} from "@/shared/constants/layout";

/** タブ画面の作業領域の高さと文字サイズ設定から、スクロールなしの1画面に収まるかを返す */
export function useFitsOneScreen(): boolean {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const budget = height - insets.top - (TAB_BAR_CONTENT_HEIGHT + insets.bottom);
  return budget >= MIN_ONE_SCREEN_BUDGET && fontScale <= MAX_ONE_SCREEN_FONT_SCALE;
}
