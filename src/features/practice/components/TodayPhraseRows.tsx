/**
 * 今日のフレーズ一覧（今日の1本・卒業済みを除く先頭3件）
 *
 * 今日の練習メニューから「今日の1本」と卒業済みフレーズを除いた残りを一覧表示する。
 * 行タップで練習を再開し、長押しでアーカイブ・削除できる。全件は別シートへ逃がす。
 */

import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Card } from "@/shared/components/molecules/Card";
import { Button } from "@/shared/components/atoms/Button";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import {
  buildTodayMenu,
  pickTodayPick,
  resolveCurrentBpm,
  type TodayMenuEntry,
} from "@/features/practice/lib/progression";
import { resolveTodayProgress } from "@/features/practice/lib/todayCompletion";
import { usePhraseLongPressActions } from "@/features/practice/hooks/usePhraseLongPressActions";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

/** カード内に表示する行数。それ以上は「すべてのフレーズ」シートへ */
const VISIBLE_COUNT = 3;

type Props = {
  onStartPhrase: (phrase: PracticePhrase, todayTargetBpm: number) => void;
  onOpenAllPhrases: () => void;
};

export function TodayPhraseRows({ onStartPhrase, onOpenAllPhrases }: Props) {
  const { data: phrases, isLoading: isLoadingPhrases } = usePracticePhrases();
  const { data: attempts, isLoading: isLoadingAttempts } = usePhraseAttempts();
  const handleLongPress = usePhraseLongPressActions();

  if (isLoadingPhrases || isLoadingAttempts) {
    return (
      <Card
        background={colors.surfaceContainerLow}
        style={{ height: 56, alignItems: "center", justifyContent: "center" }}
      >
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  const allAttempts = attempts ?? [];
  const menuItems = buildTodayMenu(phrases ?? [], allAttempts);
  const todayPick = pickTodayPick(menuItems);

  const allPhrasesButton = (
    <Button
      label={`すべてのフレーズ ${menuItems.length}本`}
      onPress={onOpenAllPhrases}
      variant="ghost"
      size="sm"
      fullWidth
    />
  );

  if (!todayPick) {
    // 保存済みフレーズが1件も無ければ、TodayPickCard側の案内で十分なのでここは何も出さない
    if (menuItems.length === 0) return null;
    // 全件卒業済み: 練習すべき行は無いので、全件シートへの導線だけ残す
    return (
      <Card background={colors.surfaceContainerLow} style={{ gap: 8 }}>
        {allPhrasesButton}
      </Card>
    );
  }

  const rest = menuItems.filter(
    (entry) => entry !== todayPick && entry.priority !== "graduated",
  );
  if (rest.length === 0) return null;

  const now = new Date();
  const attemptsOf = (entry: TodayMenuEntry): PhraseAttempt[] =>
    allAttempts.filter((attempt: PhraseAttempt) => attempt.phraseId === entry.phrase.id);
  const rows = rest.map((entry) => {
    const attempts = attemptsOf(entry);
    return {
      entry,
      currentBpm: resolveCurrentBpm(entry.phrase.currentBpm, attempts),
      status: resolveTodayProgress(entry.phrase, attempts, now),
    };
  });
  const completedCount = rows.filter((row) => row.status.reached).length;

  return (
    <Card background={colors.surfaceContainerLow} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, color: colors.onSurface }}>
          <Text style={{ fontWeight: "700" }}>今日のフレーズ</Text>
          <Text style={{ color: colors.onSurfaceVariant }}>
            {" "}
            {rest.length}本中{completedCount}本完了
          </Text>
        </Text>
        <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>長押しで整理</Text>
      </View>

      <View>
        {rows.slice(0, VISIBLE_COUNT).map(({ entry, currentBpm, status }, index) => {
          const completed = status.reached;
          return (
            <Pressable
              key={entry.phrase.id}
              onPress={() => onStartPhrase(entry.phrase, status.targetBeforeToday)}
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
              {completed ? (
                <Icon name="check_circle" size={20} color={colors.primary} />
              ) : (
                <View style={{ width: 20 }} />
              )}
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: "600",
                  color: completed ? colors.onSurfaceVariant : colors.onSurface,
                }}
                numberOfLines={1}
              >
                {entry.phrase.name}
              </Text>
              {completed ? (
                <Text style={{ fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"], color: colors.primary }}>
                  {status.todayBestOkBpm}
                  <Text style={{ fontSize: 12, fontWeight: "600" }}> 今日完了</Text>
                </Text>
              ) : (
                <Text style={{ fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                  <Text style={{ color: colors.onSurfaceVariant }}>{currentBpm}</Text>
                  <Text style={{ color: colors.onSurfaceVariant }}> → </Text>
                  <Text style={{ color: colors.primary }}>{status.targetBeforeToday}</Text>
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {allPhrasesButton}
    </Card>
  );
}
