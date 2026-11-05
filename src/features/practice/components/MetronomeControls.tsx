/**
 * メトロノームの表示とBPM操作
 *
 * 音出し自体はuseMetronomeEngine（PracticeTab側で保持）が持ち、ここは表示とBPM操作だけを担当する。
 * 今鳴っている拍は親からpropsで受けず、拍ストアをここで直接購読する（拍ごとに親を描き直さないため）。
 * PracticeControlPanel（動画読み込み後）とPracticeMenuSheet（メトロノーム単体利用）の両方から
 * 同じ道具として使う。
 */

import { useCallback, useEffect } from "react";
import { Pressable, Text, View, type AccessibilityActionEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
import { useHoldRepeat } from "@/shared/hooks/useHoldRepeat";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EASING, ms } from "@/shared/lib/motion";
import { useMetronomeBeatStore } from "@/stores/metronomeBeat";

type Props = {
  bpm: number;
  enabled: boolean;
  beatsPerBar: number;
  onStepBpm: (delta: number) => void;
  onToggleEnabled: () => void;
  /** 練習中フレーズがあるときだけ表示する「前回◯BPM・卒業まであとN」 */
  phraseProgress?: { lastReachedBpm: number; bpmToGraduate: number } | null;
};

export function MetronomeControls({
  bpm,
  enabled,
  beatsPerBar,
  onStepBpm,
  onToggleEnabled,
  phraseProgress,
}: Props) {
  const activeBeat = useMetronomeBeatStore((s) => s.activeBeat);
  const beatDots = Array.from({ length: beatsPerBar }, (_, i) => i);

  const decHold = useHoldRepeat(() => onStepBpm(-1));
  const incHold = useHoldRepeat(() => onStepBpm(1));

  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!enabled) return;
    pulse.value = withSequence(
      withTiming(1.3, { duration: ms(reduced, "fast"), easing: EASING.decelerate }),
      withTiming(1, { duration: ms(reduced, "fast"), easing: EASING.accelerate }),
    );
  }, [activeBeat, enabled, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const handleTempoAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "increment") onStepBpm(1);
      if (event.nativeEvent.actionName === "decrement") onStepBpm(-1);
    },
    [onStepBpm],
  );
  const tempoValueText = phraseProgress
    ? `${bpm} BPM、前回 ${phraseProgress.lastReachedBpm}、卒業まであと${phraseProgress.bpmToGraduate}`
    : `${bpm} BPM`;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Pressable
        onPress={decHold.onPress}
        onPressIn={decHold.onPressIn}
        onPressOut={decHold.onPressOut}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${colors.primaryContainer}33`,
        }}
        accessibilityRole="button"
        accessibilityLabel="メトロノームBPMを1下げる"
        accessibilityHint="長押しで連続変更"
      >
        <Icon name="remove" size={20} color={colors.primary} />
      </Pressable>

      <View
        style={{ alignItems: "center" }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="メトロノームのテンポ"
        accessibilityValue={{ min: BPM_MIN, max: BPM_MAX, now: bpm, text: tempoValueText }}
        accessibilityActions={[
          { name: "increment", label: "1上げる" },
          { name: "decrement", label: "1下げる" },
        ]}
        onAccessibilityAction={handleTempoAction}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Animated.Text
            testID="metronome-bpm-value"
            maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}
            style={[
              { fontSize: 36, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] },
              pulseStyle,
            ]}
          >
            {bpm}
          </Animated.Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant }}>BPM</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
          {beatDots.map((i) => (
            <Animated.View
              key={i}
              testID={`metronome-beat-dot-${i}`}
              style={[
                {
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: enabled && i === activeBeat ? colors.primary : colors.outlineVariant,
                },
                i === activeBeat ? pulseStyle : null,
              ]}
            />
          ))}
        </View>
        {phraseProgress && (
          <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 }}>
            前回 {phraseProgress.lastReachedBpm} ・ 卒業まであと{phraseProgress.bpmToGraduate}
          </Text>
        )}
      </View>

      <Pressable
        onPress={incHold.onPress}
        onPressIn={incHold.onPressIn}
        onPressOut={incHold.onPressOut}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${colors.primaryContainer}33`,
        }}
        accessibilityRole="button"
        accessibilityLabel="メトロノームBPMを1上げる"
        accessibilityHint="長押しで連続変更"
      >
        <Icon name="add" size={20} color={colors.primary} />
      </Pressable>

      <Pressable
        onPress={onToggleEnabled}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: enabled ? colors.primary : colors.surfaceContainer,
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        accessibilityLabel="メトロノームの開始・停止"
      >
        <Animated.View style={enabled ? pulseStyle : undefined}>
          <Icon name="metronome" size={20} color={enabled ? colors.onPrimary : colors.onSurfaceVariant} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
