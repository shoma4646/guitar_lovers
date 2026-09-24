/**
 * 進捗バー
 *
 * マウント時に0から伸ばして、どれだけ進んだかを一目で分かるようにする。
 */

import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { semantic } from "@/shared/theme/semantic";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EASING, ms } from "@/shared/lib/motion";

type Props = {
  /** 0〜1 */
  ratio: number;
  height?: number;
  /** 複数並べるときに順に伸ばすための遅延（ミリ秒） */
  delay?: number;
  fillColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({
  ratio,
  height = 6,
  delay = 0,
  fillColor = semantic.progressFill,
  accessibilityLabel,
  style,
}: Props) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, ratio));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      reduced ? 0 : delay,
      withTiming(clamped, { duration: ms(reduced, "slow"), easing: EASING.decelerate }),
    );
  }, [clamped, delay, reduced, progress]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      style={[
        { height, borderRadius: height / 2, backgroundColor: semantic.progressTrack, overflow: "hidden" },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height,
            borderRadius: height / 2,
            backgroundColor: fillColor,
            transformOrigin: "left",
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
