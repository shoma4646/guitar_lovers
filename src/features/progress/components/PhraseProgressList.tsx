/**
 * フレーズ別BPM推移リスト（練習中）
 *
 * 1段目にフレーズ名、2段目に進捗バーと「開始BPM → 現在BPM / 目標BPM」を並べ、標準の文字サイズで1行56ptに収める。
 * データ取得は呼び出し側（画面・シート）が `usePhraseProgressSummaries` で行い、本体は表示に専念する。
 */

import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import { ProgressBar } from "@/shared/components/atoms/ProgressBar";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";

type Props = {
  items: PhraseProgressSummary[];
  /** 表示する最大件数。未指定なら全件表示する（全件シート用） */
  maxItems?: number;
};

export function PhraseProgressList({ items, maxItems }: Props) {
  const visible = maxItems !== undefined ? items.slice(0, maxItems) : items;

  if (visible.length === 0) {
    return (
      <Text style={styles.empty}>
        Practiceタブでフレーズを保存すると、ここにBPMの推移が表示されます
      </Text>
    );
  }

  return (
    <View>
      {visible.map((summary, index) => (
        <PhraseProgressRow key={summary.phrase.id} summary={summary} delay={index * 70} />
      ))}
    </View>
  );
}

function PhraseProgressRow({
  summary,
  delay,
}: {
  summary: PhraseProgressSummary;
  delay: number;
}) {
  const { phrase, startBpm, currentBpm, targetBpm, progressRatio } = summary;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${phrase.name}、開始${startBpm}から目標${targetBpm}のうち現在${currentBpm}`}
    >
      <Text style={styles.name} numberOfLines={1}>
        {phrase.name}
      </Text>
      <View testID="phrase-progress-meter" style={styles.meterRow}>
        <ProgressBar ratio={progressRatio} delay={delay} style={styles.bar} />
        <Text testID="phrase-progress-range" style={styles.range} maxFontSizeMultiplier={1.3}>
          {startBpm} →{" "}
          <Text style={styles.current}>{currentBpm}</Text> / 目標{targetBpm}
        </Text>
      </View>
    </View>
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
  range: {
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
