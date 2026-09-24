/**
 * フレーズ練習結果の記録シート
 *
 * 「今日の練習メニュー」からフレーズ練習を終了したときに表示する。
 * ○（弾けた）/ △（あやしい）/ ×（弾けなかった）と、練習していたBPM・回数を記録する。
 * ○でそのBPMが目標BPM以上なら、呼び出し側（PracticeTab）がフレーズを卒業させる。
 */

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { Button } from "@/shared/components/atoms/Button";
import { Icon } from "@/shared/components/atoms/Icon";
import { ProgressBar } from "@/shared/components/atoms/ProgressBar";
import { colors, radius } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { formatDuration } from "@/features/practice/lib/formatters";
import { stepBpm } from "@/features/practice/lib/tempo";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";

type Result = PhraseAttempt["result"];
type SubmitAction = "next" | "finish";

const RESULT_OPTIONS: { key: Result; label: string; icon: "add" | "remove" | "star" }[] = [
  { key: "ok", label: "弾けた", icon: "star" },
  { key: "partial", label: "あやしい", icon: "add" },
  { key: "ng", label: "弾けなかった", icon: "remove" },
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
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [result, setResult] = useState<Result>("ok");
  /**
   * 次回の提案BPM。あくまでこのシート上だけのUI表示で、既存の記録フロー（attempt / フレーズのtargetBpm）には
   * 保存しない。開いた時点のBPMから見た目上の提案値を計算するだけの値
   */
  const [nextTargetBpm, setNextTargetBpm] = useState(bpm);

  useEffect(() => {
    if (visible) {
      setResult("ok");
      setNextTargetBpm(stepBpm(bpm, 5));
    }
  }, [visible, bpm]);

  if (!phrase) return null;

  const diffFromPrevious = progress ? bpm - progress.currentBpm : 0;
  const bpmToGraduate = progress ? Math.max(0, progress.targetBpm - bpm) : 0;
  const span = progress ? progress.targetBpm - progress.startBpm : 0;
  const todayRatio = progress
    ? span <= 0
      ? bpm >= progress.targetBpm
        ? 1
        : 0
      : Math.max(0, Math.min(1, (bpm - progress.startBpm) / span))
    : 0;

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
          <View style={{ gap: 4 }}>
            <ProgressBar ratio={todayRatio} accessibilityLabel={`${phrase.name}の進捗`} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>開始 {progress.startBpm}</Text>
              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>前回 {progress.currentBpm}</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: colors.primary }}>今日 {bpm}</Text>
              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>卒業 {progress.targetBpm}</Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
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
                accessibilityState={{ selected: active }}
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
          onDecrement={() => onChangeCompletedReps(-1)}
          onIncrement={() => onChangeCompletedReps(1)}
          decrementDisabled={completedReps === 0}
        />

        <Stepper
          label="次回の目標"
          value={nextTargetBpm}
          suffix="BPM"
          onDecrement={() => setNextTargetBpm((v) => stepBpm(v, -1))}
          onIncrement={() => setNextTargetBpm((v) => stepBpm(v, 1))}
        />

        <View style={{ gap: 8 }}>
          <Button
            label="記録して次の1本へ"
            onPress={() => onSubmit({ result }, "next")}
            variant="primary"
            disabled={isSubmitting}
            fullWidth
          />
          <Button
            label="記録して今日は終わる"
            onPress={() => onSubmit({ result }, "finish")}
            variant="outline"
            disabled={isSubmitting}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

type StepperProps = {
  label: string;
  value: number;
  suffix?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
};

function Stepper({ label, value, suffix, onDecrement, onIncrement, decrementDisabled }: StepperProps) {
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
