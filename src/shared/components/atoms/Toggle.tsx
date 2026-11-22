/**
 * ON/OFFのトグルスイッチ
 *
 * OSごとの見た目差（Androidの既定アクセント色など）を出さないため、RNの`Switch`ではなく自前で描く。
 * 見た目は44×24、タップ領域は縦44ptを確保する。
 */

import { Pressable, View, type Insets } from "react-native";
import { colors, radius } from "@/shared/theme";

/** トグルの配色。OFFのトラックもカードの白に対して3:1以上にする */
export const toggleColors = {
  trackOn: colors.primary,
  trackOff: colors.outline,
  thumb: colors.surfaceContainerLowest,
} as const;

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const TRACK_PADDING = 2;
const THUMB_SIZE = TRACK_HEIGHT - TRACK_PADDING * 2;
const DEFAULT_HIT_SLOP: Insets = { top: 10, bottom: 10, left: 0, right: 0 };

type Props = {
  value: boolean;
  /** 押されたときに反転後の値を渡す */
  onValueChange: (next: boolean) => void;
  /** 読み上げ用のラベル（必須） */
  accessibilityLabel: string;
  disabled?: boolean;
  /** 隣の操作とタップ領域が重なるときに調整する。既定は上下10pt */
  hitSlop?: Insets;
};

export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false, hitSlop = DEFAULT_HIT_SLOP }: Props) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: radius.full,
        padding: TRACK_PADDING,
        opacity: disabled ? 0.4 : 1,
        backgroundColor: value ? toggleColors.trackOn : toggleColors.trackOff,
        alignItems: value ? "flex-end" : "flex-start",
      }}
    >
      <View
        testID="toggle-thumb"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: toggleColors.thumb,
        }}
      />
    </Pressable>
  );
}
