/**
 * 全フレーズシート
 *
 * アーカイブ済みを除く全フレーズを一覧表示する。タップで練習を再開し、
 * 長押しでアーカイブ・削除できる（TodayPhraseRowsと同じ操作）。
 */

import { ScrollView, View, Text, Pressable } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { buildTodayMenu, resolveCurrentBpm } from "@/features/practice/lib/progression";
import { resolveTodayProgress } from "@/features/practice/lib/todayCompletion";
import { usePhraseLongPressActions } from "@/features/practice/hooks/usePhraseLongPressActions";
import type { PracticePhrase } from "@/shared/types/models";

type Props = {
  visible: boolean;
  onClose: () => void;
  onStartPhrase: (phrase: PracticePhrase, todayTargetBpm: number) => void;
};

export function AllPhrasesSheet({ visible, onClose, onStartPhrase }: Props) {
  const { data: phrases } = usePracticePhrases();
  const { data: attempts } = usePhraseAttempts();
  const handleLongPress = usePhraseLongPressActions();

  const allAttempts = attempts ?? [];
  const menuItems = buildTodayMenu(phrases ?? [], allAttempts);
  const now = new Date();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`すべてのフレーズ（${menuItems.length}本）`}>
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingBottom: 16 }}>
          {menuItems.length === 0 ? (
            <Text
              style={{ fontSize: 14, color: colors.onSurfaceVariant, paddingVertical: 24 }}
            >
              保存したフレーズはまだありません
            </Text>
          ) : (
            menuItems.map((entry, index) => {
              const phraseAttempts = allAttempts.filter((a) => a.phraseId === entry.phrase.id);
              // 今日の記録を除いた目標を使い、当日中に表示がぶれないようにする(TodayPhraseRowsと同じ扱い)
              const { targetBeforeToday } = resolveTodayProgress(entry.phrase, phraseAttempts, now);
              return (
                <Pressable
                  key={entry.phrase.id}
                  onPress={() => onStartPhrase(entry.phrase, targetBeforeToday)}
                  onLongPress={() => handleLongPress(entry.phrase)}
                  className="active:opacity-80"
                  style={{
                    height: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.divider,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.phrase.name}の練習を開始`}
                  accessibilityHint="長押しでアーカイブ・削除"
                >
                  <Text
                    style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.onSurface }}
                    numberOfLines={1}
                  >
                    {entry.priority === "graduated" && (
                      <Text style={{ color: semantic.graduated }}>卒業・</Text>
                    )}
                    {entry.phrase.name}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}
                  >
                    {resolveCurrentBpm(entry.phrase.currentBpm, phraseAttempts)} → {targetBeforeToday}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
