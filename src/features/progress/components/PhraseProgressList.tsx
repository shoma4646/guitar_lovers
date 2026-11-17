/**
 * フレーズ別BPM推移リスト（練習中）
 *
 * 1段目にフレーズ名、2段目に進捗バーと「開始BPM → 現在BPM / 目標BPM」を並べ、標準の文字サイズで1行56ptに収める。
 * データ取得は呼び出し側（画面・シート）が `usePhraseProgressSummaries` で行い、本体は表示に専念する。
 */

import { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import { colors } from "@/shared/theme";
import { ProgressBar } from "@/shared/components/atoms/ProgressBar";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";

/** 範囲欄に入りうる最も長い表示。全行の範囲欄をこの幅にそろえ、桁数でバーの長さが変わらないようにする */
const WIDEST_RANGE = { startBpm: 999, currentBpm: 999, targetBpm: 999 };

/** 範囲欄の文字サイズの拡大上限 */
const RANGE_MAX_FONT_SIZE_MULTIPLIER = 1.3;

type Props = {
  items: PhraseProgressSummary[];
  /** 表示する最大件数。未指定なら全件表示する（全件シート用） */
  maxItems?: number;
  /** 先頭行の高さを測ったときに呼ばれる。表示行数を決める側が行の実測値を使うためのもの */
  onRowLayout?: (height: number) => void;
};

export function PhraseProgressList({ items, maxItems, onRowLayout }: Props) {
  const visible = maxItems !== undefined ? items.slice(0, maxItems) : items;
  const [rangeMinWidth, setRangeMinWidth] = useState<number | undefined>(undefined);
  const handleTemplateLayout = (event: LayoutChangeEvent) => {
    setRangeMinWidth(Math.ceil(event.nativeEvent.layout.width));
  };

  if (visible.length === 0) {
    return (
      <Text style={styles.empty}>
        Practiceタブでフレーズを保存すると、ここにBPMの推移が表示されます
      </Text>
    );
  }

  return (
    <View>
      <View
        style={styles.rangeTemplate}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <RangeText
          testID="phrase-progress-range-template"
          {...WIDEST_RANGE}
          onLayout={handleTemplateLayout}
        />
      </View>
      {visible.map((summary, index) => (
        <PhraseProgressRow
          key={summary.phrase.id}
          summary={summary}
          delay={index * 70}
          rangeMinWidth={rangeMinWidth}
          onLayout={
            index === 0 && onRowLayout
              ? (event) => onRowLayout(event.nativeEvent.layout.height)
              : undefined
          }
        />
      ))}
    </View>
  );
}

function PhraseProgressRow({
  summary,
  delay,
  rangeMinWidth,
  onLayout,
}: {
  summary: PhraseProgressSummary;
  delay: number;
  rangeMinWidth: number | undefined;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { phrase, startBpm, currentBpm, targetBpm, progressRatio } = summary;

  return (
    <View
      testID="phrase-progress-row"
      style={styles.row}
      onLayout={onLayout}
      accessible
      accessibilityLabel={`${phrase.name}、開始${startBpm}から目標${targetBpm}のうち現在${currentBpm}`}
    >
      <Text style={styles.name} numberOfLines={1}>
        {phrase.name}
      </Text>
      <View testID="phrase-progress-meter" style={styles.meterRow}>
        <ProgressBar ratio={progressRatio} delay={delay} style={styles.bar} />
        <RangeText
          testID="phrase-progress-range"
          startBpm={startBpm}
          currentBpm={currentBpm}
          targetBpm={targetBpm}
          minWidth={rangeMinWidth}
        />
      </View>
    </View>
  );
}

/** 「開始BPM → 現在BPM / 目標BPM」の表示。行と幅の基準（最長の表示）で同じ見た目にするため共通化する */
function RangeText({
  testID,
  startBpm,
  currentBpm,
  targetBpm,
  minWidth,
  onLayout,
}: {
  testID: string;
  startBpm: number;
  currentBpm: number;
  targetBpm: number;
  minWidth?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <Text
      testID={testID}
      style={[styles.range, { minWidth }]}
      maxFontSizeMultiplier={RANGE_MAX_FONT_SIZE_MULTIPLIER}
      onLayout={onLayout}
    >
      {startBpm} →{" "}
      <Text style={styles.current}>{currentBpm}</Text> / 目標{targetBpm}
    </Text>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  row: {
    minHeight: 56,
    justifyContent: "center",
    gap: 4,
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bar: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  rangeTemplate: {
    position: "absolute",
    opacity: 0,
  },
  range: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  current: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
  },
});
