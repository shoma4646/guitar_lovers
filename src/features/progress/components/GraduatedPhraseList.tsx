/**
 * 卒業したフレーズの一覧（Progress画面、フレーズの上達の直下）
 *
 * 目標BPMに到達したフレーズ（アーカイブ済みを除く）を卒業日の新しい順に表示する。
 * 卒業フレーズが1件も無ければ何も表示しない。
 */

import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { summarizePhraseProgress } from "@/features/progress/lib/phraseProgress";

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function GraduatedPhraseList() {
  const { data: phrases } = usePracticePhrases();
  const { data: attempts } = usePhraseAttempts();

  const graduates = useMemo(() => {
    if (!phrases) return [];
    return phrases
      .filter((phrase) => !phrase.archivedAt)
      .map((phrase) =>
        summarizePhraseProgress(
          phrase,
          (attempts ?? []).filter((a) => a.phraseId === phrase.id),
        ),
      )
      .flatMap((summary) =>
        summary.graduatedAt ? [{ ...summary, graduatedAt: summary.graduatedAt }] : [],
      )
      .sort(
        (a, b) => new Date(b.graduatedAt).getTime() - new Date(a.graduatedAt).getTime(),
      );
  }, [phrases, attempts]);

  if (graduates.length === 0) return null;

  return (
    <View
      className="bg-surface-container-lowest"
      style={[styles.card, shadowStyle, { marginBottom: 24 }]}
    >
      <Text
        className="text-label-sm"
        style={{
          color: colors.outline,
          letterSpacing: 1.2,
          fontWeight: "600",
          marginBottom: 16,
        }}
      >
        卒業したフレーズ
      </Text>
      <View style={{ gap: 12 }}>
        {graduates.map(({ phrase, startBpm, currentBpm, targetBpm, graduatedAt }) => (
          <View
            key={phrase.id}
            className="flex-row items-center justify-between"
            accessibilityLabel={`${phrase.name}、${formatMonthDay(graduatedAt)}に卒業、${startBpm}から${currentBpm}、目標${targetBpm}BPM`}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                className="text-body-md"
                style={{ color: colors.onSurface, fontWeight: "600" }}
                numberOfLines={1}
              >
                {phrase.name}
              </Text>
              <Text
                className="text-label-sm"
                style={{ color: colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}
              >
                {startBpm} → {currentBpm}（目標{targetBpm}）
              </Text>
            </View>
            <Text
              className="text-label-sm"
              style={{ color: colors.tertiary, fontWeight: "700", fontVariant: ["tabular-nums"] }}
            >
              {formatMonthDay(graduatedAt)} 卒業
            </Text>
          </View>
        ))}
      </View>
    </View>
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
  card: {
    padding: 20,
    borderRadius: 16,
  },
});
