/**
 * 共通ボタン
 *
 * 最小タップ領域44ptとアクセシビリティ属性をここで担保し、画面側は variant を選ぶだけにする。
 */

import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors, radius } from "@/shared/theme";

export type ButtonVariant = "primary" | "tonal" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** ラベル左に置くアイコン */
  icon?: IconName;
  disabled?: boolean;
  /** 横幅いっぱいに広げる */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 44, md: 48, lg: 52 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 };

const SURFACE: Record<ButtonVariant, { background: string; border?: string; foreground: string }> = {
  primary: { background: colors.primary, foreground: colors.onPrimary },
  tonal: { background: colors.primaryFixed, foreground: colors.onPrimaryFixedVariant },
  outline: {
    background: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    foreground: colors.onSurface,
  },
  ghost: { background: "transparent", foreground: colors.primary },
  destructive: { background: colors.errorContainer, foreground: colors.onErrorContainer },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const surface = SURFACE[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          height: HEIGHT[size],
          paddingHorizontal: size === "sm" ? 14 : 18,
          borderRadius: radius.pill,
          backgroundColor: surface.background,
          borderWidth: surface.border ? 1 : 0,
          borderColor: surface.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          alignSelf: fullWidth ? "stretch" : "auto",
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={surface.foreground} /> : null}
      <View>
        <Text
          maxFontSizeMultiplier={1.4}
          style={{ color: surface.foreground, fontSize: FONT_SIZE[size], fontWeight: "700" }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
