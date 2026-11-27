/**
 * 全フレーズシート
 *
 * アーカイブ済みを除く全フレーズを一覧表示する。タップで練習を再開し、
 * 長押しでアーカイブ・削除できる（TodayPhraseRowsと同じ操作）。
 */

import { ScrollView, View, Text } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { ReadErrorCard } from "@/shared/components/molecules/ReadErrorCard";
import { hasReadFailure, refetchAll } from "@/shared/lib/readFailure";
import { colors } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { resolveCurrentBpm } from "@/features/practice/lib/progression";
import { usePhraseLongPressActions } from "@/features/practice/hooks/usePhraseLongPressActions";
import { useTodayMenu } from "@/features/practice/hooks/useTodayMenu";
import { PhraseMenuRow, needsLeadingIcon } from "./PhraseMenuRow";
import type { PracticePhrase } from "@/shared/types/models";

type Props = {
  visible: boolean;
  onClose: () => void;
  onStartPhrase: (phrase: PracticePhrase, startBpm: number) => void;
};

export function AllPhrasesSheet({ visible, onClose, onStartPhrase }: Props) {
  const phrasesQuery = usePracticePhrases();
  const attemptsQuery = usePhraseAttempts();
  const { data: attempts } = attemptsQuery;
  const handleLongPress = usePhraseLongPressActions();
  const readFailed = hasReadFailure(phrasesQuery, attemptsQuery);

  const allAttempts = attempts ?? [];
  const menuItems = useTodayMenu();
  const hasLeadingIcon = menuItems.some((entry) => needsLeadingIcon(entry));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scrollable={false}
      title={readFailed ? "すべてのフレーズ" : `すべてのフレーズ（${menuItems.length}本）`}
    >
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingBottom: 16 }}>
          {readFailed ? (
            <ReadErrorCard
              title="フレーズを読み込めませんでした"
              onRetry={() => refetchAll(phrasesQuery, attemptsQuery)}
            />
          ) : menuItems.length === 0 ? (
            <Text
              style={{ fontSize: 14, color: colors.onSurfaceVariant, paddingVertical: 24 }}
            >
              保存したフレーズはまだありません
            </Text>
          ) : (
            menuItems.map((entry, index) => {
              const phraseAttempts = allAttempts.filter((a) => a.phraseId === entry.phrase.id);
              return (
                <PhraseMenuRow
                  key={entry.phrase.id}
                  entry={entry}
                  currentBpm={resolveCurrentBpm(entry.phrase.currentBpm, phraseAttempts)}
                  isFirst={index === 0}
                  reserveLeadingSlot={hasLeadingIcon}
                  onPress={() => onStartPhrase(entry.phrase, entry.today.targetBeforeToday)}
                  onLongPress={() => handleLongPress(entry.phrase)}
                  onOrganize={(action) => handleLongPress(entry.phrase, action)}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
