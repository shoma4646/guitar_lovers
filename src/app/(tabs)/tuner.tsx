/**
 * チューナー画面
 * ギターの各弦をチューニングするためのUIを提供する。
 * 実際のピッチ検出にはネイティブビルドが必要なため、
 * デモモードで各弦を順番にシミュレートする。
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/constants/colors";
import {
  tuningPresets,
  TuningPresetKey,
  TUNING_THRESHOLD_CENTS,
} from "@/shared/constants/tuning";

/** デモモードで1弦あたり表示するミリ秒 */
const DEMO_INTERVAL_MS = 2000;

/** デモ用セント値のシーケンス（-30 → 0 → +20 → 0） */
const DEMO_CENTS_SEQUENCE = [-28, -15, -5, 2, 0, 0, 18, 5, 0, 0];

/** 各弦の表示番号（6弦〜1弦） */
const STRING_NUMBERS = [6, 5, 4, 3, 2, 1];

/**
 * セント値をメーター表示用の割合に変換する（-50〜+50 → 0〜1）
 */
function centsToMeterRatio(cents: number): number {
  return Math.max(0, Math.min(1, (cents + 50) / 100));
}

/**
 * セント値に応じたメーターカラーを返す
 */
function getMeterColor(cents: number): string {
  if (Math.abs(cents) <= TUNING_THRESHOLD_CENTS) return colors.tuned;
  if (cents < 0) return colors.flat;
  return colors.sharp;
}

/**
 * 練習時間を mm:ss 形式にフォーマットする
 */
function formatCents(cents: number): string {
  const sign = cents > 0 ? "+" : "";
  return `${sign}${Math.round(cents)} cents`;
}

/**
 * チューナー画面コンポーネント
 */
export default function TunerScreen() {
  /** 選択中のチューニングプリセットキー */
  const [selectedPreset, setSelectedPreset] =
    useState<TuningPresetKey>("standard");

  /** 検出（デモ）動作中フラグ */
  const [isActive, setIsActive] = useState(false);

  /** 現在フォーカスしている弦インデックス（0=6弦） */
  const [focusedStringIndex, setFocusedStringIndex] = useState(0);

  /** 現在表示中のノート名 */
  const [currentNote, setCurrentNote] = useState<string | null>(null);

  /** 現在のセント値 */
  const [cents, setCents] = useState(0);

  /** 各弦のチューニング完了状態 */
  const [tunedStrings, setTunedStrings] = useState<boolean[]>([
    false, false, false, false, false, false,
  ]);

  /** デモシーケンスの現在インデックス */
  const demoSeqIndexRef = useRef(0);

  /** デモタイマーのref */
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** ノート名のフェードアニメーション値 */
  const noteOpacity = useRef(new Animated.Value(1)).current;

  const preset = tuningPresets[selectedPreset];

  /**
   * ノート名が変わるときにフェードアニメーションを実行する
   */
  const animateNoteChange = useCallback(
    (newNote: string) => {
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
      setCurrentNote(newNote);
    },
    [noteOpacity]
  );

  /**
   * デモモードの1ティック処理
   */
  const demoTick = useCallback(() => {
    setFocusedStringIndex((prevStringIdx) => {
      const seqIdx = demoSeqIndexRef.current;
      const centsVal = DEMO_CENTS_SEQUENCE[seqIdx];
      const note = preset.notes[prevStringIdx];

      setCents(centsVal);
      animateNoteChange(note);

      demoSeqIndexRef.current =
        (seqIdx + 1) % DEMO_CENTS_SEQUENCE.length;

      // シーケンスが一周したら次の弦へ
      if (demoSeqIndexRef.current === 0) {
        // チューニング完了とみなして次の弦へ
        setTunedStrings((prev) => {
          const next = [...prev];
          next[prevStringIdx] = true;
          return next;
        });

        const nextIdx = (prevStringIdx + 1) % 6;
        return nextIdx;
      }

      return prevStringIdx;
    });
  }, [preset, animateNoteChange]);

  /**
   * 開始/停止ボタンのハンドラ
   */
  const handleToggleActive = useCallback(() => {
    if (isActive) {
      // 停止
      if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
      setIsActive(false);
      setCurrentNote(null);
      setCents(0);
    } else {
      // ネイティブビルドでのみ実際のピッチ検出が可能であることを通知
      Alert.alert(
        "デモモードで起動",
        "マイクからのピッチ検出にはネイティブビルドが必要です。\nデモモードで各弦のチューニングをシミュレートします。",
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "デモ開始",
            onPress: () => {
              setIsActive(true);
              demoSeqIndexRef.current = 0;
              setTunedStrings([false, false, false, false, false, false]);
              setFocusedStringIndex(0);
              demoTimerRef.current = setInterval(
                demoTick,
                DEMO_INTERVAL_MS / DEMO_CENTS_SEQUENCE.length
              );
            },
          },
        ]
      );
    }
  }, [isActive, demoTick]);

  /**
   * プリセット変更時は検出を停止してリセット
   */
  const handleSelectPreset = useCallback(
    (key: TuningPresetKey) => {
      if (isActive) {
        if (demoTimerRef.current) {
          clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
        }
        setIsActive(false);
        setCurrentNote(null);
        setCents(0);
      }
      setSelectedPreset(key);
      setTunedStrings([false, false, false, false, false, false]);
      setFocusedStringIndex(0);
    },
    [isActive]
  );

  // アンマウント時のタイマークリーンアップ
  useEffect(() => {
    return () => {
      if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
      }
    };
  }, []);

  // demoTick が変わったときにインターバルを再設定
  useEffect(() => {
    if (isActive && demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = setInterval(
        demoTick,
        DEMO_INTERVAL_MS / DEMO_CENTS_SEQUENCE.length
      );
    }
  }, [demoTick, isActive]);

  /** メーターの割合（0〜1） */
  const meterRatio = centsToMeterRatio(cents);
  const meterColor = getMeterColor(cents);
  const isTuned = Math.abs(cents) <= TUNING_THRESHOLD_CENTS && isActive;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgDark }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* チューニングプリセット選択 */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
            チューニング
          </Text>
          <View style={styles.presetRow}>
            {(Object.keys(tuningPresets) as TuningPresetKey[]).map((key) => {
              const active = key === selectedPreset;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleSelectPreset(key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.bgGray,
                      borderColor: active ? colors.primary : colors.bgGray,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.textWhite : colors.textGray },
                    ]}
                  >
                    {tuningPresets[key].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 弦インジケーター */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
            弦の状態
          </Text>
          <View style={styles.stringsRow}>
            {preset.notes.map((note, idx) => {
              const isFocused = isActive && idx === focusedStringIndex;
              const isTunedString = tunedStrings[idx];
              const stringNum = STRING_NUMBERS[idx];

              return (
                <View
                  key={idx}
                  style={[
                    styles.stringCell,
                    {
                      backgroundColor: isFocused
                        ? colors.primary + "33"
                        : colors.bgLightDark,
                      borderColor: isFocused
                        ? colors.primary
                        : isTunedString
                        ? colors.tuned
                        : colors.bgGray,
                      borderWidth: isFocused ? 2 : 1,
                    },
                  ]}
                  accessibilityLabel={`${stringNum}弦 ${note} ${isTunedString ? "チューニング完了" : "未チューニング"}`}
                >
                  <Text
                    style={[
                      styles.stringNumber,
                      { color: colors.textGray },
                    ]}
                  >
                    {stringNum}弦
                  </Text>
                  <Text
                    style={[
                      styles.stringNote,
                      {
                        color: isTunedString
                          ? colors.tuned
                          : isFocused
                          ? colors.primary
                          : colors.textWhite,
                        fontWeight: isFocused ? "700" : "400",
                      },
                    ]}
                  >
                    {note}
                  </Text>
                  {/* チューニング完了インジケーター */}
                  <View
                    style={[
                      styles.tunedDot,
                      {
                        backgroundColor: isTunedString
                          ? colors.tuned
                          : colors.bgGray,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* ノート名の大きな表示 */}
        <View
          style={[
            styles.noteDisplay,
            {
              backgroundColor: colors.bgLightDark,
              borderColor: isTuned ? colors.tuned : colors.bgGray,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.noteText,
              {
                color: isTuned ? colors.tuned : colors.textWhite,
                opacity: noteOpacity,
              },
            ]}
            accessibilityLiveRegion="polite"
          >
            {currentNote ?? "--"}
          </Animated.Text>
          {isTuned && (
            <Text style={[styles.tunedLabel, { color: colors.tuned }]}>
              チューニング完了
            </Text>
          )}
        </View>

        {/* ビジュアルメーター */}
        <View style={styles.section}>
          <View
            style={[
              styles.meterContainer,
              { backgroundColor: colors.bgLightDark },
            ]}
          >
            {/* センターライン */}
            <View
              style={[
                styles.meterCenterLine,
                { backgroundColor: colors.textGray },
              ]}
            />
            {/* メーターバー */}
            <View
              style={[
                styles.meterBar,
                {
                  width: `${Math.abs(meterRatio - 0.5) * 100}%`,
                  left: meterRatio < 0.5 ? `${meterRatio * 100}%` : "50%",
                  backgroundColor: meterColor,
                },
              ]}
            />
            {/* インジケーター（針） */}
            <View
              style={[
                styles.meterIndicator,
                {
                  left: `${meterRatio * 100}%`,
                  backgroundColor: meterColor,
                },
              ]}
            />
          </View>

          {/* フラット/シャープラベル */}
          <View style={styles.meterLabels}>
            <Text style={[styles.meterLabelText, { color: colors.flat }]}>
              フラット
            </Text>
            <Text style={[styles.meterLabelText, { color: colors.textGray }]}>
              |
            </Text>
            <Text style={[styles.meterLabelText, { color: colors.sharp }]}>
              シャープ
            </Text>
          </View>

          {/* セント値表示 */}
          <Text
            style={[styles.centsText, { color: meterColor }]}
            accessibilityLiveRegion="polite"
          >
            {isActive ? formatCents(cents) : "-- cents"}
          </Text>
        </View>

        {/* 開始/停止ボタン */}
        <TouchableOpacity
          onPress={handleToggleActive}
          style={[
            styles.startButton,
            {
              backgroundColor: isActive ? colors.error : colors.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isActive ? "チューナーを停止" : "チューナーを開始"}
        >
          <Text style={[styles.startButtonText, { color: colors.textWhite }]}>
            {isActive ? "停止" : "開始"}
          </Text>
        </TouchableOpacity>

        {/* ネイティブビルド必要メッセージ */}
        <Text style={[styles.nativeNote, { color: colors.textGray }]}>
          マイクからのピッチ検出にはネイティブビルドが必要です
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stringsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  stringCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  stringNumber: {
    fontSize: 10,
    fontWeight: "500",
  },
  stringNote: {
    fontSize: 13,
    fontWeight: "600",
  },
  tunedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteDisplay: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 20,
    gap: 8,
  },
  noteText: {
    fontSize: 72,
    fontWeight: "700",
    letterSpacing: -2,
  },
  tunedLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  meterContainer: {
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    marginBottom: 8,
  },
  meterCenterLine: {
    position: "absolute",
    width: 2,
    height: "100%",
    left: "50%",
    zIndex: 2,
  },
  meterBar: {
    position: "absolute",
    height: "60%",
    top: "20%",
    borderRadius: 4,
    zIndex: 1,
  },
  meterIndicator: {
    position: "absolute",
    width: 4,
    height: "90%",
    top: "5%",
    borderRadius: 2,
    marginLeft: -2,
    zIndex: 3,
  },
  meterLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  meterLabelText: {
    fontSize: 11,
    fontWeight: "500",
  },
  centsText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  startButton: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  nativeNote: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
});
