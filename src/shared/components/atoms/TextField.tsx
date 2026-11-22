/**
 * 1行の共通入力欄
 *
 * 高さは44pt以上を保ちつつ文字サイズに合わせて伸び、大きな文字設定でも入力中の文字が切れない。
 * 呼び出し側の `style` は既定の見た目に重ねて適用する。
 */

import { TextInput, type TextInputProps } from "react-native";
import { colors, radius } from "@/shared/theme";

// シートの中で使うため、文字が大きくなりすぎてシートの高さを押し広げない上限
const MAX_FONT_SIZE_MULTIPLIER = 1.6;

export function TextField({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.onSurfaceVariant}
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      {...props}
      style={[
        {
          minHeight: 44,
          borderRadius: radius.md,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 16,
          backgroundColor: colors.surfaceContainerLow,
          color: colors.onSurface,
        },
        style,
      ]}
    />
  );
}
