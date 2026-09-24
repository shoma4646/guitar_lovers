/**
 * チューナー画面
 *
 * タブを開いている間だけマイク入力からピッチを検出する（開始/停止ボタンは持たない）。
 * usePitchDetectorが検出のライフサイクルを担い、この画面は検出周波数を最寄りの弦・
 * セント差・針の角度へ変換して描画する。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Icon } from "@/shared/components/atoms/Icon";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { SegmentedControl } from "@/shared/components/atoms/SegmentedControl";
import { Card } from "@/shared/components/molecules/Card";
import { ScreenFrame } from "@/shared/components/molecules/ScreenFrame";
import { colors, radius } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import {
  tuningPresets,
  TuningPresetKey,
  TUNING_THRESHOLD_CENTS,
} from "@/shared/constants/tuning";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import {
  usePitchDetector,
  type PitchDetectorStatus,
} from "@/features/tuner/hooks/usePitchDetector";
import { NeedleMeter } from "@/features/tuner/components/NeedleMeter";
import {
  frequencyToNote,
  nearestStringInPreset,
} from "@/features/tuner/lib/pitch";
import { describeTuning, tuningState } from "@/features/tuner/lib/meter";

/** 各弦の表示番号（6弦〜1弦） */
const STRING_NUMBERS = [6, 5, 4, 3, 2, 1];

/** 許容範囲内がこの時間続いたら弦をチューニング済みにする */
const TUNED_HOLD_MS = 500;

const UNTUNED_STRINGS = [false, false, false, false, false, false];

/** セント値を `+12 cents` 形式に整形。針の可動範囲（±50）を超える場合はその旨を示す */
function formatCents(cents: number): string {
  if (cents > 50) return "+50 cents以上";
  if (cents < -50) return "-50 cents以下";
  const sign = cents > 0 ? "+" : "";
  return `${sign}${Math.round(cents)} cents`;
}

type MicChipTone = "active" | "paused" | "warning";

const MIC_CHIP_DOT_COLOR: Record<MicChipTone, string> = {
  active: semantic.tunerInTune,
  paused: semantic.tunerIdle,
  warning: semantic.tunerOff,
};

/** ヘッダーのマイク状態チップ。タップで一時停止/再開をトグルする */
function MicStatusChip({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: MicChipTone;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => [
        styles.micChip,
        { opacity: !onPress ? 0.7 : pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.micChipDot, { backgroundColor: MIC_CHIP_DOT_COLOR[tone] }]} />
      <Text style={styles.micChipLabel}>{label}</Text>
    </Pressable>
  );
}

/** 現在のマイク状態からヘッダーチップの表示内容を決める */
function getMicChipConfig(
  status: PitchDetectorStatus,
  pausedByUser: boolean,
  pause: () => void,
  resume: () => void,
): { label: string; tone: MicChipTone; onPress?: () => void } {
  if (pausedByUser) return { label: "一時停止中", tone: "paused", onPress: resume };
  if (status === "listening") return { label: "マイク入力中", tone: "active", onPress: pause };
  if (status === "denied") return { label: "マイク未許可", tone: "warning" };
  if (status === "error") return { label: "マイクエラー", tone: "warning", onPress: resume };
  return { label: "準備中…", tone: "paused" };
}

type BadgeTone = "in" | "warn" | "idle";

const BADGE_STYLE: Record<BadgeTone, { bg: string; fg: string }> = {
  in: { bg: colors.primaryFixed, fg: colors.onPrimaryFixedVariant },
  warn: { bg: colors.errorContainer, fg: colors.onErrorContainer },
  idle: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant },
};

export function TunerScreen() {
  const router = useRouter();
  const { status, hz, inputLevelDb, pausedByUser, pause, resume } = usePitchDetector();

  const [selectedPreset, setSelectedPreset] = useState<TuningPresetKey>("standard");
  const [focusedStringIndex, setFocusedStringIndex] = useState<number | null>(null);
  /** 検出音がプリセット内のどの弦にも該当しないときの実際の音名（例: "G4"） */
  const [freeNoteLabel, setFreeNoteLabel] = useState<string | null>(null);
  const [cents, setCents] = useState(0);
  const [tunedStrings, setTunedStrings] = useState<boolean[]>(UNTUNED_STRINGS);

  const reducedMotion = useReducedMotion();
  const noteOpacity = useSharedValue(1);
  const inTuneSinceRef = useRef<number | null>(null);
  const lastNoteRef = useRef<string | null>(null);

  const preset = tuningPresets[selectedPreset];

  const animateNoteChange = useCallback(() => {
    if (reducedMotion) return;
    noteOpacity.value = withSequence(
      withTiming(0, { duration: 100 }),
      withTiming(1, { duration: 200 }),
    );
  }, [noteOpacity, reducedMotion]);

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

  const handleSelectPreset = useCallback((key: TuningPresetKey) => {
    setSelectedPreset(key);
    setTunedStrings(UNTUNED_STRINGS);
    setFocusedStringIndex(null);
    setFreeNoteLabel(null);
    setCents(0);
    lastNoteRef.current = null;
  }, []);

  const currentState = tuningState(cents);
  const isTuned = focusedStringIndex !== null && Math.abs(cents) <= TUNING_THRESHOLD_CENTS;
  const displayNote = focusedStringIndex !== null ? preset.notes[focusedStringIndex] : (freeNoteLabel ?? "--");

  const stringCentsText =
    focusedStringIndex !== null
      ? `${STRING_NUMBERS[focusedStringIndex]}弦 ・ ${formatCents(cents)}`
      : freeNoteLabel
        ? "近い弦が見つかりません"
        : "-- cents";

  const badgeText = pausedByUser
    ? "一時停止中です"
    : status === "denied"
      ? "マイクの利用が許可されていません"
      : status === "error"
        ? "マイクを開始できませんでした"
        : status === "requesting"
          ? "準備中です"
          : focusedStringIndex !== null
            ? describeTuning(currentState)
            : "弦を1本ずつ鳴らしてください";

  const badgeTone: BadgeTone = pausedByUser
    ? "idle"
    : status === "denied" || status === "error"
      ? "warn"
      : status === "requesting"
        ? "idle"
        : focusedStringIndex !== null
          ? currentState === "in"
            ? "in"
            : "warn"
          : "idle";

  const badgeStyle = BADGE_STYLE[badgeTone];
  const micChipConfig = getMicChipConfig(status, pausedByUser, pause, resume);

  const noteAnimatedStyle = useAnimatedStyle(() => ({ opacity: noteOpacity.value }));

  const presetItems = (Object.keys(tuningPresets) as TuningPresetKey[]).map((key) => ({
    value: key,
    label: tuningPresets[key].label,
  }));

  return (
    <ErrorBoundary>
      <ScreenFrame>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>チューナー</Text>
          <MicStatusChip {...micChipConfig} />
          <IconButton
            name="settings"
            accessibilityLabel="設定を開く"
            color={colors.primary}
            onPress={() => router.push("/settings")}
          />
        </View>

        <SegmentedControl
          items={presetItems}
          value={selectedPreset}
          onChange={handleSelectPreset}
          role="radio"
          accessibilityLabel="チューニングプリセット"
        />

        <Card elevation="low" padding={20}>
          <View style={{ gap: 12 }}>
            <View style={styles.hzRow}>
              <Text style={styles.hzText}>{hz !== null ? `${hz.toFixed(1)} Hz` : "-- Hz"}</Text>
              <Text style={styles.levelText}>
                {inputLevelDb !== null && Number.isFinite(inputLevelDb)
                  ? `入力レベル ${inputLevelDb.toFixed(0)} dB`
                  : "入力レベル -- dB"}
              </Text>
            </View>

            <NeedleMeter cents={cents} hasSignal={focusedStringIndex !== null} state={currentState} />

            <View style={{ alignItems: "center" }}>
              <Animated.Text
                style={[
                  styles.noteText,
                  noteAnimatedStyle,
                  { color: isTuned ? semantic.tunerInTune : colors.primary },
                ]}
              >
                {displayNote}
              </Animated.Text>
              <Text style={styles.stringCentsText}>{stringCentsText}</Text>
            </View>

            <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.badgeText, { color: badgeStyle.fg }]} accessibilityLiveRegion="polite">
                {badgeText}
              </Text>
            </View>

            {status === "denied" && (
              <Pressable
                onPress={() => void Linking.openSettings()}
                style={styles.openSettingsLink}
                accessibilityRole="button"
                accessibilityLabel="端末の設定を開く"
              >
                <Text style={styles.openSettingsLabel}>設定を開く</Text>
              </Pressable>
            )}
          </View>
        </Card>

        <View style={styles.stringGrid} accessibilityRole="radiogroup" accessibilityLabel="弦の状態">
          {preset.notes.map((note, idx) => {
            const isFocused = idx === focusedStringIndex;
            const isTunedString = tunedStrings[idx];
            const stringNum = STRING_NUMBERS[idx];

            return (
              <View
                key={idx}
                style={[
                  styles.stringCell,
                  isTunedString
                    ? { backgroundColor: colors.primaryFixed, borderWidth: 0 }
                    : isFocused
                      ? { borderWidth: 2, borderColor: colors.primary }
                      : { borderWidth: 1, borderColor: colors.outlineVariant },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isFocused }}
                accessibilityLabel={`${stringNum}弦 ${note} ${isTunedString ? "チューニング完了" : "未チューニング"}`}
              >
                <Text
                  style={[
                    styles.stringNumberText,
                    {
                      color: isTunedString
                        ? colors.onPrimaryFixedVariant
                        : isFocused
                          ? colors.primary
                          : colors.outline,
                    },
                  ]}
                >
                  {stringNum}弦
                </Text>
                <View style={styles.stringNoteRow}>
                  <Text
                    style={[
                      styles.stringNoteText,
                      { color: isTunedString ? colors.onPrimaryFixedVariant : colors.onSurface },
                    ]}
                  >
                    {note}
                  </Text>
                  {isTunedString && (
                    <Icon name="check" size={14} color={colors.onPrimaryFixedVariant} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.referencePitchText}>基準ピッチ A = 440 Hz</Text>
      </ScreenFrame>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
  },
  micChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
  },
  micChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  micChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  hzRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hzText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  levelText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  noteText: {
    fontSize: 88,
    fontWeight: "800",
    lineHeight: 96,
    letterSpacing: -5.28, // -0.06em × 88
    fontVariant: ["tabular-nums"],
  },
  stringCentsText: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  badge: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  openSettingsLink: {
    alignSelf: "center",
  },
  openSettingsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  stringGrid: {
    flexDirection: "row",
    gap: 8,
  },
  stringCell: {
    flex: 1,
    height: 68,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surfaceContainerLowest,
  },
  stringNumberText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stringNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stringNoteText: {
    fontSize: 15,
    fontWeight: "800",
  },
  referencePitchText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});
