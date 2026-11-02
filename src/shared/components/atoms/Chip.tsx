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

// 幅320・文字1.3倍で6等分すると「1.25x」は約0.6倍まで縮める必要があり、フォント差の余裕を見た下限
const GROW_MIN_FONT_SCALE = 0.5;

const growTextFitProps = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: GROW_MIN_FONT_SCALE,
} as const;

export function Chip({ label, selected, onPress, accessibilityLabel, grow = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      className="active:opacity-80"
      style={{
        flex: grow ? 1 : undefined,
        height: 44,
        paddingHorizontal: grow ? 2 : 14,
        borderRadius: radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? colors.primary : colors.surfaceContainerLowest,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.outlineVariant,
      }}
    >
      <Text
        {...(grow ? growTextFitProps : undefined)}
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
