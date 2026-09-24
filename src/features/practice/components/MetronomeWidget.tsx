/**
 * メトロノームウィジェット（Stitch modern_3 風）
 *
 * - "METRONOME" ラベル + 4 ビートのドット表示
 * - 大型 BPM 表示（display-numeric 64px）と +/- ボタン
 * - START / STOP CTA
 *
 * クリック音はAudioContextの時間軸上でlookahead予約し、UI更新とHapticsは
 * その予約時刻に合わせて遅延実行する。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { AudioContext, AudioManager } from "react-native-audio-api";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, shadows } from "@/shared/theme";
import { usePracticeStore, PRESET_BPMS } from "@/stores/practice";
import {
  bpmToIntervalSec,
  scheduleBeats,
} from "@/features/practice/lib/metronomeScheduler";
import { scheduleClick } from "@/features/practice/lib/metronomeClick";

const BEAT_DOTS = [0, 1, 2, 3];
const BEATS_PER_BAR = BEAT_DOTS.length;
/** 先読み予約する秒数。ポーリング間隔より十分長くしないと拍が抜ける */
const LOOKAHEAD_SEC = 0.1;
const TICK_INTERVAL_MS = 25;
/** 開始直後の最初の拍までの猶予。0だとAudioContext起動前の時刻を予約して鳴らない */
const FIRST_BEAT_DELAY_SEC = 0.05;

export function MetronomeWidget() {
  const bpm = usePracticeStore((s) => s.metronomeBpm);
  const enabled = usePracticeStore((s) => s.metronomeEnabled);
  const setMetronomeBpm = usePracticeStore((s) => s.setMetronomeBpm);
  const setMetronomeEnabled = usePracticeStore((s) => s.setMetronomeEnabled);

  const beatScale = useRef(new Animated.Value(1)).current;
  const intervalSecRef = useRef(bpmToIntervalSec(bpm));
  const [activeBeat, setActiveBeat] = useState(0);

  useEffect(() => {
    intervalSecRef.current = bpmToIntervalSec(bpm);
  }, [bpm]);

  const animateBeat = useCallback(
    (beatIndex: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.timing(beatScale, {
          toValue: 1.08,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(beatScale, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
      setActiveBeat(beatIndex);
    },
    [beatScale],
  );

  useEffect(() => {
    if (!enabled) return;

    AudioManager.setAudioSessionOptions({
      iosCategory: "playback",
      iosOptions: ["mixWithOthers"],
    });
    const ctx = new AudioContext();
    let nextBeatTime = ctx.currentTime + FIRST_BEAT_DELAY_SEC;
    let beatIndex = 0;
    const uiTimers = new Set<ReturnType<typeof setTimeout>>();

    const ticker = setInterval(() => {
      const result = scheduleBeats({
        now: ctx.currentTime,
        nextBeatTime,
        intervalSec: intervalSecRef.current,
        lookaheadSec: LOOKAHEAD_SEC,
        beatIndex,
        beatsPerBar: BEATS_PER_BAR,
      });
      nextBeatTime = result.nextBeatTime;
      beatIndex = result.beatIndex;

      for (const beat of result.beats) {
        scheduleClick(ctx, beat.time, beat.isAccent);
        const delayMs = Math.max(0, (beat.time - ctx.currentTime) * 1000);
        const timer = setTimeout(() => {
          uiTimers.delete(timer);
          animateBeat(beat.beatIndex);
        }, delayMs);
        uiTimers.add(timer);
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(ticker);
      uiTimers.forEach((timer) => clearTimeout(timer));
      setActiveBeat(0);
      void ctx.close();
    };
  }, [enabled, animateBeat]);

  return (
    <View
      className="bg-surface-container-lowest"
      style={[styles.container, shadowStyle]}
    >
      {/* Header: METRONOME label + beat dots */}
      <View className="flex-row items-center justify-between">
        <Text
          className="text-label-sm"
          style={{
            color: colors.onSurfaceVariant,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          METRONOME
        </Text>
        <View className="flex-row" style={{ gap: 8 }}>
          {BEAT_DOTS.map((i) => (
            <View
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor:
                  enabled && i === activeBeat ? colors.primary : colors.outlineVariant,
              }}
            />
          ))}
        </View>
      </View>

      {/* BPM Display */}
      <View className="flex-row items-center justify-around" style={{ paddingVertical: 16 }}>
        <Pressable
          onPress={() => setMetronomeBpm(bpm - 5)}
          className="items-center justify-center active:scale-90"
          style={[
            styles.adjustBtn,
            { backgroundColor: `${colors.primaryContainer}33` },
          ]}
          accessibilityLabel="BPMを5下げる"
        >
          <Icon name="remove" size={22} color={colors.primary} />
        </Pressable>

        <Animated.View
          className="items-center"
          style={{ transform: [{ scale: beatScale }] }}
        >
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Text
            className="text-label-sm"
            style={{
              color: colors.onSurfaceVariant,
              letterSpacing: 1,
              fontWeight: "600",
            }}
          >
            BPM
          </Text>
        </Animated.View>

        <Pressable
          onPress={() => setMetronomeBpm(bpm + 5)}
          className="items-center justify-center active:scale-90"
          style={[
            styles.adjustBtn,
            { backgroundColor: `${colors.primaryContainer}33` },
          ]}
          accessibilityLabel="BPMを5上げる"
        >
          <Icon name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Start / Stop CTA */}
      <Pressable
        onPress={() => setMetronomeEnabled(!enabled)}
        className="w-full flex-row items-center justify-center active:opacity-90"
        style={{
          height: 52,
          marginTop: 16,
          borderRadius: 16,
          backgroundColor: enabled ? colors.error : colors.primary,
          gap: 8,
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
      >
        <Icon
          name={enabled ? "pause" : "play_circle"}
          size={22}
          color={colors.onPrimary}
        />
        <Text
          className="text-label-sm"
          style={{
            color: colors.onPrimary,
            fontWeight: "700",
            letterSpacing: 1,
          }}
        >
          {enabled ? "STOP" : "START PRACTICE"}
        </Text>
      </Pressable>

      {/* BPM Presets */}
      <View
        className="flex-row flex-wrap justify-center"
        style={{ gap: 8, marginTop: 16 }}
      >
        {PRESET_BPMS.map((presetBpm) => {
          const active = bpm === presetBpm;
          return (
            <Pressable
              key={presetBpm}
              onPress={() => setMetronomeBpm(presetBpm)}
              className="active:opacity-80"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: active
                  ? colors.primary
                  : colors.surfaceContainer,
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text
                className="text-label-sm"
                style={{
                  color: active ? colors.onPrimary : colors.onSurfaceVariant,
                  fontWeight: "600",
                }}
              >
                {presetBpm}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const shadowStyle = {
  ...shadows.layered,
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    gap: 4,
  },
  adjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  bpmValue: {
    fontSize: 64,
    fontWeight: "800",
    lineHeight: 64,
    letterSpacing: -2.56,
    color: colors.onSurface,
    fontVariant: ["tabular-nums"],
  },
});
