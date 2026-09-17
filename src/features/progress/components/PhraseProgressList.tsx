/**
 * フレーズ別BPM推移リスト（Progress画面の上段・主役）
 *
 * 練習中のフレーズ（アーカイブ・卒業済みを除く）ごとに「開始BPM → 現在BPM → 目標BPM」を進捗バーで表示する。
 * フレーズが1件も無ければ、同じカード枠内に案内文を表示する。
 */

import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { summarizePhraseProgress } from "@/features/progress/lib/phraseProgress";

export function PhraseProgressList() {
  const { data: phrases } = usePracticePhrases();
  const { data: attempts } = usePhraseAttempts();

  const { summaries, graduatedCount } = useMemo(() => {
    if (!phrases) return { summaries: [], graduatedCount: 0 };
    const active = phrases
      .filter((phrase) => !phrase.archivedAt)
      .map((phrase) =>
        summarizePhraseProgress(
          phrase,
          (attempts ?? []).filter((a) => a.phraseId === phrase.id),
        ),
      );
    const inProgress = active
      .filter((summary) => !summary.graduatedAt)
      .sort(
        (a, b) =>
          new Date(b.phrase.updatedAt).getTime() -
          new Date(a.phrase.updatedAt).getTime(),
      );
    return { summaries: inProgress, graduatedCount: active.length - inProgress.length };
  }, [phrases, attempts]);

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
          textTransform: "uppercase",
          fontWeight: "600",
          marginBottom: 16,
        }}
      >
        フレーズの上達
      </Text>
      {summaries.length === 0 ? (
        <Text className="text-on-surface-variant text-body-md">
          {graduatedCount > 0
            ? "練習中のフレーズはありません。保存したフレーズはすべて卒業しました"
            : "Practiceタブでフレーズを保存すると、ここにBPMの推移が表示されます"}
        </Text>
      ) : (
        <View style={{ gap: 16 }}>
          {summaries.map(({ phrase, startBpm, currentBpm, targetBpm, progressRatio, gainBpm }) => (
            <View key={phrase.id} style={{ gap: 6 }}>
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-body-md"
                  style={{ color: colors.onSurface, fontWeight: "600", flex: 1 }}
                  numberOfLines={1}
                >
                  {phrase.name}
                </Text>
                <Text
                  className="text-label-sm"
                  style={{
                    color: colors.onSurfaceVariant,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {startBpm} → {currentBpm} / 目標{targetBpm}
                </Text>
              </View>
              {gainBpm !== undefined && gainBpm > 0 ? (
                <Text
                  className="text-label-sm"
                  style={{ color: colors.tertiary, fontWeight: "700", fontVariant: ["tabular-nums"] }}
                >
                  +{gainBpm} BPM
                </Text>
              ) : null}
              <View style={styles.track}>
                <View
                  style={{
                    width: `${Math.round(progressRatio * 100)}%`,
                    height: "100%",
                    borderRadius: 9999,
                    backgroundColor: colors.tertiary,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
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
  track: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: "#00000014",
    overflow: "hidden",
  },
});
