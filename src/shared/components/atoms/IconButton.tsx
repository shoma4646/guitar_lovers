/**
 * アイコンだけのボタン
 *
 * 見た目が小さくてもタップ領域は44ptを確保する。ラベルは必須にして読み上げを担保する。
 */

import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors } from "@/shared/theme";

type Props = {
  name: IconName;
  onPress: () => void;
  /** 読み上げ用のラベル（必須） */
  accessibilityLabel: string;
  size?: number;
  color?: string;
  /** 押されている状態を持つトグルの場合に渡す */
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TOUCH_SIZE = 44;

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 22,
  color = colors.onSurfaceVariant,
  selected,
  disabled = false,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        {
          width: TOUCH_SIZE,
          height: TOUCH_SIZE,
          borderRadius: TOUCH_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}
