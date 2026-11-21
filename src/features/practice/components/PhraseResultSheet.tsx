/**
 * フレーズ練習結果の記録シート
 *
 * 「今日の練習メニュー」からフレーズ練習を終了したときに表示する。
 * ○（弾けた）/ △（あやしい）/ ×（弾けなかった）と、練習していたBPM・回数を記録する。
 * ○でそのBPMが目標BPM以上なら、呼び出し側（PracticeTab）がフレーズを卒業させる。
 */

import { useEffect, useState } from "react";
import { Pressable, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { Icon } from "@/shared/components/atoms/Icon";
import { ProgressBar } from "@/shared/components/atoms/ProgressBar";
import { colors, radius } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
import { formatDuration } from "@/features/practice/lib/formatters";
import { computeTodayTargetBpm } from "@/features/practice/lib/progression";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";

type Result = PhraseAttempt["result"];
type SubmitAction = "next" | "finish";

const RESULT_OPTIONS: { key: Result; label: string; icon: "circle" | "change_history" | "close" }[] = [
  { key: "ok", label: "弾けた", icon: "circle" },
  { key: "partial", label: "あやしい", icon: "change_history" },
  { key: "ng", label: "弾けなかった", icon: "close" },
];

type Props = {
  visible: boolean;
  phrase: PracticePhrase | null;
  /** 記録するBPM（練習中パネルのメトロノームBPMをそのまま使うため、このシートでは編集不可） */
  bpm: number;
  /** 開始BPM・前回到達BPM・目標BPMのサマリ（今回の記録を含まない既存データから算出） */
  progress: PhraseProgressSummary | null;
  /** このフレーズの練習を開始してからの経過時間（秒） */
  phraseElapsedSeconds: number;
  completedReps: number;
  onChangeCompletedReps: (delta: number) => void;
  /** 「記録して次の1本へ」で進む先があるか。無ければ「記録して今日は終わる」だけを主ボタンで出す */
  hasNextPhrase: boolean;
  /** 記録の送信中は両ボタンを無効化し、二度押しでの重複記録を防ぐ */
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: { result: Result }, action: SubmitAction) => void;
};

export function PhraseResultSheet({
  visible,
  phrase,
  bpm,
  progress,
  phraseElapsedSeconds,
  completedReps,
  onChangeCompletedReps,
  hasNextPhrase,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [result, setResult] = useState<Result>("ok");
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (visible) {
      setResult("ok");
    }
  }, [visible]);

  if (!phrase) return null;

  /**
   * 次回の目標BPMの自動プレビュー。保存はしない（保存対象にできる既存フィールドが無いため）。
   * progression.tsのcomputeTodayTargetBpmを、いま選んでいる結果(○/△/×)とこのBPMをそのまま
   * 「今回の記録」とみなして呼び出し、実際に記録した場合に決まる値をそのまま表示する
   */
  const nextTargetBpm = progress
    ? computeTodayTargetBpm(
        result === "ok" ? Math.max(progress.currentBpm, bpm) : progress.currentBpm,
        { id: "", phraseId: phrase.id, date: "", bpm, result },
        progress.targetBpm,
      )
    : bpm;

  const diffFromPrevious = progress ? bpm - progress.currentBpm : 0;
  const bpmToGraduate = progress ? Math.max(0, progress.targetBpm - bpm) : 0;
  const todayRatio = progress ? ratioOnBar(bpm, progress) : 0;
  const previousRatio = progress ? ratioOnBar(progress.currentBpm, progress) : 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={phrase.name}>
      <View style={{ gap: 14, paddingTop: 4, paddingBottom: 8 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] }}>
            {bpm} BPM × {completedReps}回
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
              練習時間 {formatDuration(phraseElapsedSeconds)}
            </Text>
            {progress && (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: diffFromPrevious > 0 ? semantic.progressFill : colors.onSurfaceVariant,
                }}
              >
                {diffFromPrevious > 0 ? `+${diffFromPrevious}` : diffFromPrevious} BPM
              </Text>
            )}
            {progress && (
              <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
                卒業まであと{bpmToGraduate}
              </Text>
            )}
          </View>
        </View>

        {progress && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }} numberOfLines={1}>
              開始 {progress.startBpm}
            </Text>
            <View
              testID="phrase-result-progress-track"
              style={{ flex: 1 }}
              onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
            >
              <BarMarker
                testIDPrefix="phrase-result-today"
                label={`今日 ${bpm}`}
                ratio={todayRatio}
                trackWidth={trackWidth}
                placement="above"
                color={colors.primary}
                emphasized
              />
              <ProgressBar ratio={todayRatio} accessibilityLabel={`${phrase.name}の進捗`} />
              <BarMarker
                testIDPrefix="phrase-result-previous"
                label={`前回 ${progress.currentBpm}`}
                ratio={previousRatio}
                trackWidth={trackWidth}
                placement="below"
                color={colors.onSurfaceVariant}
              />
            </View>
            <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }} numberOfLines={1}>
              卒業 {progress.targetBpm}
            </Text>
          </View>
        )}

        <View
          style={{ flexDirection: "row", gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel="練習の結果"
        >
          {RESULT_OPTIONS.map((opt) => {
            const active = result === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setResult(opt.key)}
                className="flex-1 items-center active:opacity-90"
                style={{
                  paddingVertical: 14,
                  borderRadius: radius.md,
                  gap: 4,
                  backgroundColor: active ? colors.primary : colors.surfaceContainer,
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Icon name={opt.icon} size={18} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? colors.onPrimary : colors.onSurfaceVariant,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Stepper
          label="回数"
          value={completedReps}
          spokenValue={`${completedReps}回`}
          onDecrement={() => onChangeCompletedReps(-1)}
          onIncrement={() => onChangeCompletedReps(1)}
          decrementDisabled={completedReps === 0}
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant }}>
            次回の目標（自動）
          </Text>
          <Text
            style={{ fontSize: 16, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] }}
          >
            {nextTargetBpm} BPM
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          {hasNextPhrase && (
            <Button
              label="記録して次の1本へ"
              onPress={() => onSubmit({ result }, "next")}
              variant="primary"
              disabled={isSubmitting}
              fullWidth
            />
          )}
          <Button
            label="記録して今日は終わる"
            onPress={() => onSubmit({ result }, "finish")}
            variant={hasNextPhrase ? "outline" : "primary"}
            disabled={isSubmitting}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

/** BPMを開始BPM〜卒業BPMのバー上の位置（0〜1）に変換する。開始と卒業が同じなら卒業以上で1、未満で0 */
function ratioOnBar(value: number, progress: PhraseProgressSummary): number {
  const span = progress.targetBpm - progress.startBpm;
  if (span <= 0) return value >= progress.targetBpm ? 1 : 0;
  return Math.max(0, Math.min(1, (value - progress.startBpm) / span));
}

const MARKER_TICK_WIDTH = 2;
const MARKER_TICK_HEIGHT = 4;

type BarMarkerProps = {
  testIDPrefix: string;
  label: string;
  /** バー上の位置（0〜1） */
  ratio: number;
  trackWidth: number;
  placement: "above" | "below";
  color: string;
  emphasized?: boolean;
};

/** 進捗バーの上か下に、値の位置を指す目盛りとラベルを置く。ラベルはバーの中央より左なら右へ、右なら左へ伸ばす */
function BarMarker({ testIDPrefix, label, ratio, trackWidth, placement, color, emphasized = false }: BarMarkerProps) {
  const paddingStyle =
    placement === "above" ? { paddingBottom: MARKER_TICK_HEIGHT } : { paddingTop: MARKER_TICK_HEIGHT };
  const textStyle = { fontSize: 10, fontWeight: emphasized ? ("700" as const) : ("400" as const), color };

  // 幅が分かる前も同じ高さを確保し、測り終えた瞬間にシートの中身が下にずれないようにする
  if (trackWidth <= 0) {
    return (
      <View style={paddingStyle} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text numberOfLines={1} maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER} style={[textStyle, { opacity: 0 }]}>
          {label}
        </Text>
      </View>
    );
  }

  const x = ratio * trackWidth;
  const tickLeft = Math.max(0, Math.min(trackWidth - MARKER_TICK_WIDTH, x - MARKER_TICK_WIDTH / 2));
  const labelPosition =
    ratio < 0.5 ? { alignSelf: "flex-start" as const, left: x } : { alignSelf: "flex-end" as const, right: trackWidth - x };

  return (
    <View style={paddingStyle}>
      <View
        testID={`${testIDPrefix}-tick`}
        style={{
          position: "absolute",
          [placement === "above" ? "bottom" : "top"]: 0,
          left: tickLeft,
          width: MARKER_TICK_WIDTH,
          height: MARKER_TICK_HEIGHT,
          backgroundColor: color,
        }}
      />
      <Text
        testID={`${testIDPrefix}-marker`}
        numberOfLines={1}
        maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}
        style={[textStyle, { fontVariant: ["tabular-nums"] }, labelPosition]}
      >
        {label}
      </Text>
    </View>
  );
}

type StepperProps = {
  label: string;
  value: number;
  /** 読み上げで値として伝える文言（例:「3回」） */
  spokenValue: string;
  suffix?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
};

function Stepper({ label, value, spokenValue, suffix, onDecrement, onIncrement, decrementDisabled }: StepperProps) {
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") onIncrement();
    if (event.nativeEvent.actionName === "decrement" && !decrementDisabled) onDecrement();
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={onDecrement}
          disabled={decrementDisabled}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            opacity: decrementDisabled ? 0.4 : 1,
            backgroundColor: colors.surfaceContainer,
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label}を減らす`}
        >
          <Icon name="remove" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
        <Text
          style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, now: value, text: spokenValue }}
          accessibilityActions={[
            { name: "increment", label: `${label}を増やす` },
            { name: "decrement", label: `${label}を減らす` },
          ]}
          onAccessibilityAction={handleAccessibilityAction}
        >
          {value}
          {suffix ? ` ${suffix}` : ""}
        </Text>
        <Pressable
          onPress={onIncrement}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surfaceContainer,
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label}を増やす`}
        >
          <Icon name="add" size={18} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}
