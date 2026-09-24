/**
 * フレーズ別BPM推移リスト（練習中）
 *
 * 「開始BPM → 現在BPM / 目標BPM」と進捗バーを1行56pt以内で表示する。
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
      accessibilityLabel={`${phrase.name}、開始${startBpm}から目標${targetBpm}のうち現在${currentBpm}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {phrase.name}
        </Text>
        <Text style={styles.range} maxFontSizeMultiplier={1.3}>
          {startBpm} →{" "}
          <Text style={styles.current}>{currentBpm}</Text> / 目標{targetBpm}
        </Text>
      </View>
      <ProgressBar ratio={progressRatio} delay={delay} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  row: {
    height: 56,
    justifyContent: "center",
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
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
