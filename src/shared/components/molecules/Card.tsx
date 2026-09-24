/**
 * カード
 *
 * 画面の情報のまとまり。影と角丸をここに集約する。
 */

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadows } from "@/shared/theme";

type Props = {
  children: ReactNode;
  /** none=塗りだけ, low=カード, high=浮いた要素 */
  elevation?: "none" | "low" | "high";
  /** 背景色。既定は白 */
  background?: string;
  padding?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  elevation = "low",
  background = colors.surfaceContainerLowest,
  padding = 16,
  accessibilityLabel,
  style,
}: Props) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor: background,
          borderRadius: radius.xl,
          padding,
        },
        elevation === "low" ? shadows.layered : null,
        elevation === "high" ? shadows.elevated : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
