/**
 * メトロノームの表示とBPM操作
 *
 * 音出し自体はuseMetronomeEngine（PracticeTab側で保持）が持ち、ここは表示とBPM操作だけを担当する。
 * PracticeControlPanel（動画読み込み後）とPracticeMenuSheet（メトロノーム単体利用）の両方から
 * 同じ道具として使う。
 */

import { useCallback, useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EASING, ms } from "@/shared/lib/motion";

type Props = {
  bpm: number;
  enabled: boolean;
  activeBeat: number;
  beatsPerBar: number;
  onStepBpm: (delta: number) => void;
  onToggleEnabled: () => void;
  /** 練習中フレーズがあるときだけ表示する「前回◯BPM・卒業まであとN」 */
  phraseProgress?: { lastReachedBpm: number; bpmToGraduate: number } | null;
};

/** 長押しで押し続けたときの最初の連続入力までの遅延（ミリ秒） */
const HOLD_REPEAT_DELAY_MS = 350;
/** 長押し中の連続入力の間隔（ミリ秒） */
const HOLD_REPEAT_INTERVAL_MS = 70;

/**
 * Pressableの長押しでコールバックを繰り返し呼ぶ
 * VoiceOverのダブルタップはonPressIn/onPressOutを発火せずonPressのみを呼ぶため、
 * 長押しリピートが始まっていなければonPressでも1段階だけ進められるようにする
 */
function useHoldRepeat(onStep: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatingRef = useRef(false);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const handlePressIn = useCallback(() => {
    repeatingRef.current = false;
    timeoutRef.current = setTimeout(() => {
      repeatingRef.current = true;
      onStep();
      intervalRef.current = setInterval(onStep, HOLD_REPEAT_INTERVAL_MS);
    }, HOLD_REPEAT_DELAY_MS);
  }, [onStep]);

  const handlePressOut = useCallback(() => {
    stop();
  }, [stop]);

  const handlePress = useCallback(() => {
    if (!repeatingRef.current) onStep();
  }, [onStep]);

  useEffect(() => stop, [stop]);

  return { onPress: handlePress, onPressIn: handlePressIn, onPressOut: handlePressOut };
}

export function MetronomeControls({
  bpm,
  enabled,
  activeBeat,
  beatsPerBar,
  onStepBpm,
  onToggleEnabled,
  phraseProgress,
}: Props) {
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
        accessibilityLabel="メトロノームBPMを1下げる。長押しで連続変更"
      >
        <Icon name="remove" size={20} color={colors.primary} />
      </Pressable>

      <View style={{ alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Animated.Text
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
        accessibilityLabel="メトロノームBPMを1上げる。長押しで連続変更"
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
