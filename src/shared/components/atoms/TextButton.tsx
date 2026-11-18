/**
 * 文字だけのボタン（13ptの太字・primary色）
 *
 * 見た目の大きさと配置は文字1行のまま、hitSlop でタップ領域を縦横44pt以上にする。
 * 上下に押せる要素が近い場所では hitSlop が重なって隣の操作を奪うため使わない。
 */

import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@/shared/theme";

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const FONT_SIZE = 13;
const TOUCH_SIZE = 44;
// 文字1行の高さは端末・フォントで変わるため、確実に下回らない fontSize を本体の大きさとみなす
const HIT_SLOP = Math.ceil((TOUCH_SIZE - FONT_SIZE) / 2);

export function TextButton({ label, onPress, accessibilityLabel, accessibilityHint, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={style}
    >
      <Text style={{ fontSize: FONT_SIZE, fontWeight: "700", color: colors.primary }}>{label}</Text>
    </Pressable>
  );
}
