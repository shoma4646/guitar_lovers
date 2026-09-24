/**
 * 卒業したフレーズの一覧
 *
 * 名前の前にトロフィーバッジを付け、色以外の手がかりでも卒業と分かるようにする。
 * データ取得は呼び出し側（画面・シート）が `usePhraseProgressSummaries` で行う。
 */

import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { Icon } from "@/shared/components/atoms/Icon";
import type { GraduatedPhraseSummary } from "@/features/progress/hooks/usePhraseProgressSummaries";

type Props = {
  items: GraduatedPhraseSummary[];
  /** 表示する最大件数。未指定なら全件表示する（全件シート用） */
  maxItems?: number;
};

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function GraduatedPhraseList({ items, maxItems }: Props) {
  const visible = maxItems !== undefined ? items.slice(0, maxItems) : items;

  if (visible.length === 0) {
    return <Text style={styles.empty}>卒業したフレーズはまだありません</Text>;
  }

  return (
    <View>
      {visible.map((summary) => (
        <GraduatedPhraseRow key={summary.phrase.id} summary={summary} />
      ))}
    </View>
  );
}

function GraduatedPhraseRow({ summary }: { summary: GraduatedPhraseSummary }) {
  const { phrase, startBpm, currentBpm, targetBpm, graduatedAt } = summary;

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${phrase.name}、${formatMonthDay(graduatedAt)}に卒業、${startBpm}から${currentBpm}、目標${targetBpm}BPM`}
    >
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Icon name="trophy" size={12} color={semantic.graduated} />
          <Text style={styles.badgeText}>卒業</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {phrase.name}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.range} maxFontSizeMultiplier={1.3}>
          {startBpm} → {currentBpm}（目標{targetBpm}）
        </Text>
        <Text style={styles.date} maxFontSizeMultiplier={1.3}>
          {formatMonthDay(graduatedAt)} 卒業
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
    height: 56,
    justifyContent: "center",
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9999,
    backgroundColor: semantic.graduatedContainer,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: semantic.graduated,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  range: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  date: {
    fontSize: 13,
    fontWeight: "700",
    color: semantic.graduated,
    fontVariant: ["tabular-nums"],
  },
});
