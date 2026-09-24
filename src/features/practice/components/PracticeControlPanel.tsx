/**
 * 練習中の操作パネル
 *
 * ABループ・シークバー・A/B点・ブックマーク・区間保存・メトロノームを1枚のCardにまとめる。
 * メトロノームの音出し自体はPracticeTab側のuseMetronomeEngineが持ち、ここは表示とBPM操作の
 * 委譲だけを担当する（動画エラーでこのパネルごと消えても音が止まらないようにするため）。
 */

import { type AccessibilityActionEvent, Pressable, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Card } from "@/shared/components/molecules/Card";
import { Divider } from "@/shared/components/atoms/Divider";
import { Icon } from "@/shared/components/atoms/Icon";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { colors, radius } from "@/shared/theme";
import { formatDuration } from "@/features/practice/lib/formatters";
import { isValidLoopRange } from "@/features/practice/lib/abLoop";
import { PracticeSeekBar } from "./PracticeSeekBar";
import { MetronomeControls } from "./MetronomeControls";
import type { ABLoop } from "@/shared/types/models";

type Props = {
  abLoop: ABLoop;
  currentTimeShared: SharedValue<number>;
  duration: number;
  onToggleLoop: () => void;
  onClearLoop: () => void;
  /** A点/B点ボタンのタップ = 設定済みのその位置へ非破壊で移動（未設定なら何もしない） */
  onTapPoint: (point: "A" | "B") => void;
  /** A点/B点ボタンの長押し（未設定時はタップでも呼ぶ） = 現在位置をその点として設定 */
  onSetPoint: (point: "A" | "B") => void;
  onScrubStart: () => void;
  onScrubEnd: (time: number) => void;
  onScrubCancel: () => void;
  scrubbingRef: React.MutableRefObject<boolean>;
  bookmarkCount: number;
  onAddBookmark: () => void;
  onOpenSavePhrase: () => void;
  metronomeBpm: number;
  metronomeEnabled: boolean;
  metronomeActiveBeat: number;
  metronomeBeatsPerBar: number;
  onStepMetronomeBpm: (delta: number) => void;
  onToggleMetronome: () => void;
  /** 練習中フレーズがあるときだけ表示する「前回◯BPM・卒業まであとN」の材料 */
  phraseProgress: { lastReachedBpm: number; bpmToGraduate: number } | null;
};

export function PracticeControlPanel({
  abLoop,
  currentTimeShared,
  duration,
  onToggleLoop,
  onClearLoop,
  onTapPoint,
  onSetPoint,
  onScrubStart,
  onScrubEnd,
  onScrubCancel,
  scrubbingRef,
  bookmarkCount,
  onAddBookmark,
  onOpenSavePhrase,
  metronomeBpm,
  metronomeEnabled,
  metronomeActiveBeat,
  metronomeBeatsPerBar,
  onStepMetronomeBpm,
  onToggleMetronome,
  phraseProgress,
}: Props) {
  const canSavePhrase = isValidLoopRange(abLoop);
  const canToggleLoop = isValidLoopRange(abLoop);
  const hasAnyPoint = abLoop.pointA !== null || abLoop.pointB !== null;

  return (
    <Card padding={12} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onSurface }}>ABループ</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {hasAnyPoint && (
            <IconButton name="close" size={18} accessibilityLabel="ABループを解除" onPress={onClearLoop} />
          )}
          <Pressable
            onPress={onToggleLoop}
            disabled={!canToggleLoop}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityRole="switch"
            accessibilityState={{ checked: abLoop.enabled, disabled: !canToggleLoop }}
            accessibilityLabel="ABループの有効・無効"
            style={{
              width: 44,
              height: 24,
              borderRadius: radius.full,
              padding: 2,
              opacity: canToggleLoop ? 1 : 0.4,
              backgroundColor: abLoop.enabled ? colors.primary : colors.surfaceContainer,
              alignItems: abLoop.enabled ? "flex-end" : "flex-start",
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.surfaceContainerLowest,
              }}
            />
          </Pressable>
        </View>
      </View>

      <PracticeSeekBar
        currentTimeShared={currentTimeShared}
        duration={duration}
        abLoop={abLoop}
        onScrubStart={onScrubStart}
        onScrubEnd={onScrubEnd}
        onScrubCancel={onScrubCancel}
        scrubbingRef={scrubbingRef}
      />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <PointButton
          label="A"
          time={abLoop.pointA}
          onTap={() => onTapPoint("A")}
          onSetPoint={() => onSetPoint("A")}
        />
        <PointButton
          label="B"
          time={abLoop.pointB}
          onTap={() => onTapPoint("B")}
          onSetPoint={() => onSetPoint("B")}
        />
        <Pressable
          onPress={onAddBookmark}
          style={{
            height: 44,
            paddingHorizontal: 12,
            borderRadius: radius.md,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.surfaceContainer,
          }}
          accessibilityRole="button"
          accessibilityLabel={`ブックマークを追加。現在${bookmarkCount}件`}
        >
          <Icon name="bookmark" size={18} color={colors.onSurfaceVariant} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}>
            {bookmarkCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenSavePhrase}
          disabled={!canSavePhrase}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            opacity: canSavePhrase ? 1 : 0.4,
            backgroundColor: colors.primaryFixed,
          }}
          accessibilityRole="button"
          accessibilityLabel="この区間を新しいフレーズにする"
        >
          <Icon name="content_cut" size={18} color={colors.onPrimaryFixedVariant} />
        </Pressable>
      </View>

      <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>
        タップでその位置へ移動（未設定ならその位置を設定）・長押しで地点を設定し直す
      </Text>

      <Divider />

      <MetronomeControls
        bpm={metronomeBpm}
        enabled={metronomeEnabled}
        activeBeat={metronomeActiveBeat}
        beatsPerBar={metronomeBeatsPerBar}
        onStepBpm={onStepMetronomeBpm}
        onToggleEnabled={onToggleMetronome}
        phraseProgress={phraseProgress}
      />
    </Card>
  );
}

type PointButtonProps = {
  label: "A" | "B";
  time: number | null;
  /** タップ（設定済みのみ）: 位置へ移動 */
  onTap: () => void;
  /** 長押し、および未設定時のタップ: 現在位置を設定 */
  onSetPoint: () => void;
};

function PointButton({ label, time, onTap, onSetPoint }: PointButtonProps) {
  const set = time !== null;

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "longpress") onSetPoint();
  };

  return (
    <Pressable
      onPress={set ? onTap : onSetPoint}
      onLongPress={onSetPoint}
      style={{
        flex: 1,
        height: 44,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: set ? colors.primaryFixed : colors.surfaceContainer,
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}点${set ? `、${formatDuration(time)}へ移動` : "、未設定"}`}
      accessibilityHint={set ? "長押しで現在位置に設定し直す" : "タップでこの位置を設定"}
      accessibilityActions={[{ name: "longpress", label: `${label}点を設定` }]}
      onAccessibilityAction={handleAccessibilityAction}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: set ? colors.onPrimaryFixedVariant : colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
        }}
      >
        {label} {set ? formatDuration(time) : "未設定"}
      </Text>
    </Pressable>
  );
}
