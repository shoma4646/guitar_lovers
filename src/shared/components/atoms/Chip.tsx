/**
 * 選択チップ
 *
 * 再生速度やBPMプリセットのような排他選択で使う。高さは44ptを確保する。
 */

import { Pressable, Text } from "react-native";
import { colors, radius } from "@/shared/theme";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** グリッド内で等幅に伸ばす */
  grow?: boolean;
};

export function Chip({ label, selected, onPress, accessibilityLabel, grow = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({
        flex: grow ? 1 : undefined,
        height: 44,
        paddingHorizontal: grow ? 0 : 14,
        borderRadius: radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? colors.primary : colors.surfaceContainerLowest,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.outlineVariant,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 14,
          fontWeight: selected ? "800" : "600",
          color: selected ? colors.onPrimary : colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
