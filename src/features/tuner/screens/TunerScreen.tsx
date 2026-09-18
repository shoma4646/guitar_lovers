/**
 * チューナー画面
 *
 * Stitch modern_1 デザインに準拠した UI。
 * - 上部 AppBar（プロフィール + タイトル + 設定）
 * - 中央 大型カード: 周波数 / ノート（display-numeric 120px）/ 半円ゲージ
 * - 6 弦セレクター（小さな円形）
 * - Standard / Auto の Quick Controls
 * - 画面下部に開始/停止 CTA
 *
 * マイク入力からのピッチ検出は usePitchDetector が担い、この画面は検出周波数を
 * 最寄りの弦・セント差・針の角度へ変換して描画する。
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import {
  tuningPresets,
  TuningPresetKey,
  TUNING_THRESHOLD_CENTS,
} from "@/shared/constants/tuning";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { usePitchDetector } from "@/features/tuner/hooks/usePitchDetector";
import { usePracticeStore } from "@/stores/practice";
import {
  frequencyToNote,
  nearestStringInPreset,
} from "@/features/tuner/lib/pitch";

/** 各弦の表示番号（6弦〜1弦） */
const STRING_NUMBERS = [6, 5, 4, 3, 2, 1];

/** 許容範囲内がこの時間続いたら弦をチューニング済みにする */
const TUNED_HOLD_MS = 500;

const UNTUNED_STRINGS = [false, false, false, false, false, false];

/** セント値をメーター表示用の割合に変換する（-50〜+50 → 0〜1） */
function centsToMeterRatio(cents: number): number {
  return Math.max(0, Math.min(1, (cents + 50) / 100));
}

/** セント値に応じたメーターカラーを返す */
function getMeterColor(cents: number): string {
  if (Math.abs(cents) <= TUNING_THRESHOLD_CENTS) return colors.success;
  if (cents < 0) return colors.info;
  return colors.danger;
}

/** セント値を `+12 cents` 形式に整形。針の可動範囲（±50）を超える場合はその旨を示す */
function formatCents(cents: number): string {
  if (cents > 50) return "+50 cents以上";
  if (cents < -50) return "-50 cents以下";
  const sign = cents > 0 ? "+" : "";
  return `${sign}${Math.round(cents)} cents`;
}

export function TunerScreen() {
  const [selectedPreset, setSelectedPreset] =
    useState<TuningPresetKey>("standard");
  const [focusedStringIndex, setFocusedStringIndex] = useState<number | null>(
    null,
  );
  /** 検出音がプリセット内のどの弦にも該当しないときの実際の音名（例: "G4"） */
  const [freeNoteLabel, setFreeNoteLabel] = useState<string | null>(null);
  const [cents, setCents] = useState(0);
  const [tunedStrings, setTunedStrings] = useState<boolean[]>(UNTUNED_STRINGS);

  const router = useRouter();
  const { status, hz, start, stop } = usePitchDetector();
  const isActive = status === "listening";

  const inTuneSinceRef = useRef<number | null>(null);
  const noteOpacity = useRef(new Animated.Value(1)).current;
  const lastNoteRef = useRef<string | null>(null);

  const preset = tuningPresets[selectedPreset];

  const animateNoteChange = useCallback(() => {
    Animated.sequence([
      Animated.timing(noteOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(noteOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [noteOpacity]);

  // 検出周波数を最寄りの弦とセント差へ変換し、許容範囲内が続いた弦をチューニング済みにする
  useEffect(() => {
    const nearest = hz === null ? null : nearestStringInPreset(hz, preset.notes);

    if (nearest === null) {
      inTuneSinceRef.current = null;
      setFocusedStringIndex(null);
      setCents(0);
      lastNoteRef.current = null;
      if (hz === null) {
        setFreeNoteLabel(null);
      } else {
        const detected = frequencyToNote(hz);
        setFreeNoteLabel(`${detected.noteName}${detected.octave}`);
      }
      return;
    }

    setFreeNoteLabel(null);
    setFocusedStringIndex(nearest.index);
    setCents(nearest.cents);

    const note = preset.notes[nearest.index];
    if (lastNoteRef.current !== note) {
      lastNoteRef.current = note;
      animateNoteChange();
    }

    if (Math.abs(nearest.cents) <= TUNING_THRESHOLD_CENTS) {
      const now = Date.now();
      if (inTuneSinceRef.current === null) {
        inTuneSinceRef.current = now;
      } else if (now - inTuneSinceRef.current >= TUNED_HOLD_MS) {
        setTunedStrings((prev) => {
          if (prev[nearest.index]) return prev;
          const next = [...prev];
          next[nearest.index] = true;
          return next;
        });
      }
    } else {
      inTuneSinceRef.current = null;
    }
  }, [hz, preset, animateNoteChange]);

  const handleToggleActive = useCallback(() => {
    if (isActive) {
      void stop();
      setCents(0);
      return;
    }
    setTunedStrings(UNTUNED_STRINGS);
    inTuneSinceRef.current = null;
    // メトロノームのクリック音（800/1000Hz）をマイクが拾い、弦の音として検出してしまうため止める
    usePracticeStore.getState().setMetronomeEnabled(false);
    void start();
  }, [isActive, start, stop]);

  const handleSelectPreset = useCallback(
    (key: TuningPresetKey) => {
      if (isActive) {
        void stop();
      }
      setSelectedPreset(key);
      setTunedStrings(UNTUNED_STRINGS);
      setFocusedStringIndex(null);
      setFreeNoteLabel(null);
      setCents(0);
      lastNoteRef.current = null;
    },
    [isActive, stop],
  );

  const meterRatio = centsToMeterRatio(isActive ? cents : 0);
  const meterColor = getMeterColor(cents);
  const isTuned =
    isActive && focusedStringIndex !== null && Math.abs(cents) <= TUNING_THRESHOLD_CENTS;
  const displayNote =
    focusedStringIndex !== null
      ? preset.notes[focusedStringIndex]
      : (freeNoteLabel ?? "--");
  const displayHz = hz;

  // -50..+50 cents → -45deg..+45deg の針回転
  const needleAngleDeg = (meterRatio - 0.5) * 90;

  const ctaLabel =
    status === "requesting" ? "開始中..." : isActive ? "停止" : "開始";
  const helperText =
    status === "denied"
      ? "マイクの許可が必要です。設定アプリから許可してください。"
      : status === "error"
        ? "マイクを開始できませんでした。他のアプリがマイクを使用していないか確認してください。"
        : isActive
          ? hz === null
            ? "弦を1本ずつ鳴らしてください"
            : "音を伸ばしたまま針が中央に来るよう調整してください"
          : "開始してから弦を鳴らすと、最も近い弦を自動で判定します";

  return (
    <ErrorBoundary>
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-surface"
      >
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-margin-mobile h-16">
          <View className="w-8 h-8 rounded-full bg-surface-container-highest items-center justify-center">
            <Icon name="school" size={18} color={colors.onSurfaceVariant} />
          </View>
          <Text className="font-bold text-headline-lg text-on-surface">
            Guitar Lovers
          </Text>
          <Pressable
            onPress={() => router.push("/settings")}
            className="active:opacity-70"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="設定を開く"
          >
            <Icon name="settings" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-margin-mobile items-center">
            {/* Microcopy */}
            <Text className="text-on-surface-variant text-label-sm tracking-widest mb-lg mt-sm">
              正確に、美しく。
            </Text>

            {/* Main Tuning Card */}
            <View
              className="w-full aspect-square bg-surface-container-lowest items-center justify-between p-xl relative overflow-hidden"
              style={[styles.mainCard, shadowStyle]}
            >
              {/* Frequency Display */}
              <Text className="text-on-surface-variant text-[14px] font-medium" style={styles.hzText}>
                {displayHz !== null ? `${displayHz.toFixed(1)} Hz` : "-- Hz"}
              </Text>

              {/* Central Note */}
              <View className="items-center">
                <Animated.Text
                  style={[
                    styles.noteText,
                    {
                      color: isTuned ? colors.success : colors.primary,
                      opacity: isActive && hz === null ? 0.35 : noteOpacity,
                    },
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  {displayNote}
                </Animated.Text>
                <View
                  className="w-2 h-2 rounded-full mt-base"
                  style={{ backgroundColor: meterColor }}
                />
              </View>

              {/* Semi-circular Gauge */}
              <View style={styles.gaugeWrap}>
                <View style={styles.gaugeRingTrack} />
                <View style={styles.gaugeRingActive} />
                {/* Needle */}
                <View
                  style={[
                    styles.needleContainer,
                    { transform: [{ rotate: `${needleAngleDeg}deg` }] },
                  ]}
                >
                  <View style={[styles.needle, { backgroundColor: meterColor }]} />
                  <View
                    style={[
                      styles.needleHead,
                      { backgroundColor: meterColor, borderColor: colors.surfaceContainerLowest },
                    ]}
                  />
                </View>
              </View>

              <Text
                className="text-label-sm font-bold mt-sm"
                style={{ color: meterColor, fontVariant: ["tabular-nums"] }}
                accessibilityLiveRegion="polite"
              >
                {isActive && focusedStringIndex !== null
                  ? formatCents(cents)
                  : "-- cents"}
              </Text>

              {/* Decoration glows */}
              <View style={styles.glowTopRight} />
              <View style={styles.glowBottomLeft} />
            </View>

            {/* String Selectors */}
            <View className="w-full mt-xl flex-row" style={{ gap: 12 }}>
              {preset.notes.map((note, idx) => {
                const isFocused =
                  isActive && focusedStringIndex !== null && idx === focusedStringIndex;
                const isTunedString = tunedStrings[idx];
                const stringNum = STRING_NUMBERS[idx];
                const displayLabel = idx === 0 ? note.toLowerCase() : note;

                return (
                  <View key={idx} className="flex-1 items-center" style={{ gap: 8 }}>
                    <Text
                      className="text-[12px] font-bold"
                      style={{
                        color: isFocused ? colors.primary : colors.outline,
                      }}
                    >
                      {stringNum}
                    </Text>
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: isFocused
                          ? colors.primaryContainer
                          : isTunedString
                            ? `${colors.success}1A`
                            : "transparent",
                        borderWidth: 1,
                        borderColor: isFocused
                          ? colors.primaryContainer
                          : isTunedString
                            ? colors.success
                            : colors.outlineVariant,
                      }}
                      accessibilityLabel={`${stringNum}弦 ${note} ${isTunedString ? "チューニング完了" : "未チューニング"}`}
                    >
                      <Text
                        className="text-[14px] font-bold"
                        style={{
                          color: isFocused
                            ? colors.onPrimaryContainer
                            : isTunedString
                              ? colors.success
                              : colors.onSurface,
                        }}
                      >
                        {displayLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Quick Controls (Preset chips) */}
            <View className="mt-xl flex-row flex-wrap justify-center" style={{ gap: 12 }}>
              {(Object.keys(tuningPresets) as TuningPresetKey[]).map((key) => {
                const active = key === selectedPreset;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleSelectPreset(key)}
                    className="flex-row items-center bg-surface-container active:opacity-80"
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 9999,
                      gap: 8,
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceContainer,
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Icon
                      name={active ? "mic" : "equalizer"}
                      size={18}
                      color={active ? colors.onPrimary : colors.onSurfaceVariant}
                    />
                    <Text
                      className="text-label-sm"
                      style={{
                        color: active ? colors.onPrimary : colors.onSurfaceVariant,
                        fontWeight: "600",
                      }}
                    >
                      {tuningPresets[key].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Start / Stop CTA */}
            <Pressable
              onPress={handleToggleActive}
              disabled={status === "requesting"}
              className="w-full mt-xl items-center justify-center active:opacity-90"
              style={{
                height: 52,
                borderRadius: 16,
                backgroundColor: isActive ? colors.error : colors.primary,
                opacity: status === "requesting" ? 0.7 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={isActive ? "チューナーを停止" : "チューナーを開始"}
            >
              <Text
                className="text-body-lg"
                style={{ color: colors.onPrimary, fontWeight: "700", letterSpacing: 0.5 }}
              >
                {ctaLabel}
              </Text>
            </Pressable>

            <Text
              className="text-on-surface-variant text-label-sm text-center mt-sm"
              style={{ lineHeight: 18 }}
            >
              {helperText}
            </Text>

            {status === "denied" && (
              <Pressable
                onPress={() => void Linking.openSettings()}
                className="mt-sm active:opacity-80"
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  backgroundColor: colors.surfaceContainer,
                }}
                accessibilityRole="button"
              >
                <Text
                  className="text-label-sm"
                  style={{ color: colors.primary, fontWeight: "600" }}
                >
                  設定を開く
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const shadowStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  mainCard: {
    borderRadius: 32,
  },
  hzText: {
    fontVariant: ["tabular-nums"],
  },
  noteText: {
    fontSize: 120,
    fontWeight: "800",
    lineHeight: 120,
    letterSpacing: -7.2, // -0.06em × 120
    fontVariant: ["tabular-nums"],
  },
  // 半円ゲージ: 直径 256 のリングを下半分にクリップ
  gaugeWrap: {
    width: "100%",
    height: 96,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  gaugeRingTrack: {
    position: "absolute",
    width: 256,
    height: 256,
    bottom: -128,
    borderWidth: 12,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: 128,
  },
  gaugeRingActive: {
    position: "absolute",
    width: 60,
    height: 256,
    bottom: -128,
    left: "50%",
    marginLeft: -30,
    borderTopWidth: 12,
    borderColor: colors.primaryContainer,
  },
  needleContainer: {
    position: "absolute",
    bottom: 0,
    width: 4,
    height: 80,
    alignItems: "center",
    transformOrigin: "bottom",
  },
  needle: {
    width: 3,
    height: 80,
    borderRadius: 2,
  },
  needleHead: {
    position: "absolute",
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  glowTopRight: {
    position: "absolute",
    top: -64,
    right: -64,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: "rgba(255,107,91,0.05)",
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -64,
    left: -64,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: "rgba(0,175,143,0.05)",
  },
});
