/**
 * セグメント切り替え
 *
 * サブタブ・プリセット選択・一覧の絞り込みで使う。role は用途に応じて tab か radio を選ぶ。
 */

import { Pressable, Text, View } from "react-native";
import { colors, radius, shadows } from "@/shared/theme";

export type SegmentedItem<T extends string> = {
  value: T;
  label: string;
  /** ラベル右に添える数値などの補足 */
  suffix?: string;
  suffixColor?: string;
};

type Props<T extends string> = {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** タブ切り替えなら tab、排他選択なら radio */
  role?: "tab" | "radio";
  accessibilityLabel: string;
};

const HEIGHT = 48;
const PADDING = 3;

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  role = "tab",
  accessibilityLabel,
}: Props<T>) {
  return (
    <View
      accessibilityRole={role === "tab" ? "tablist" : "radiogroup"}
      accessibilityLabel={accessibilityLabel}
      style={{
        height: HEIGHT,
        padding: PADDING,
        borderRadius: HEIGHT / 2,
        backgroundColor: colors.surfaceContainer,
        flexDirection: "row",
        gap: PADDING,
      }}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            accessibilityRole={role}
            accessibilityState={role === "tab" ? { selected } : { checked: selected }}
            style={({ pressed }) => ({
              flex: 1,
              borderRadius: radius["2xl"],
              backgroundColor: selected ? colors.surfaceContainerLowest : "transparent",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 4,
              opacity: pressed && !selected ? 0.7 : 1,
              ...(selected ? shadows.layered : null),
            })}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: 14,
                fontWeight: selected ? "700" : "500",
                color: selected ? colors.onSurface : colors.onSurfaceVariant,
              }}
            >
              {item.label}
            </Text>
            {item.suffix ? (
              <Text
                maxFontSizeMultiplier={1.3}
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: item.suffixColor ?? (selected ? colors.primary : colors.onSurfaceVariant),
                  fontVariant: ["tabular-nums"],
                }}
              >
                {item.suffix}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
