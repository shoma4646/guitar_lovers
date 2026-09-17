/**
 * 今日の練習メニューカード
 *
 * Practiceタブを開いた直後の主役。保存済みフレーズ（アーカイブ済みを除く）を一覧し、
 * 各フレーズの「前回BPM → 今日の目標BPM」を表示する。行タップで練習を再開する。
 */

import { useCallback, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { useArchivePracticePhrase } from "@/features/practice/api/useArchivePracticePhrase";
import { useDeletePracticePhrase } from "@/features/practice/api/useDeletePracticePhrase";
import { usePracticeStore } from "@/stores/practice";
import {
  buildTodayMenu,
  pickTodayPick,
  type TodayMenuPriority,
} from "@/features/practice/lib/progression";
import type { PracticePhrase } from "@/shared/types/models";
import { cardShadowStyle, cardStyle } from "./cardStyle";

const TODAY_PICK_REASONS: Record<Exclude<TodayMenuPriority, "graduated">, string> = {
  retry: "前回はうまくいかなかったので、無理のないテンポでもう一度",
  stale: "前回は弾けたフレーズ",
  fresh: "まだ記録がありません",
};

type Props = {
  onStartPhrase: (phrase: PracticePhrase, todayTargetBpm: number) => void;
  /** 空状態でサンプル動画から練習を試すためのコールバック */
  onTryPreset: () => void;
};

export function TodayMenuCard({ onStartPhrase, onTryPreset }: Props) {
  const { data: phrases, isLoading: isLoadingPhrases } = usePracticePhrases();
  const { data: attempts, isLoading: isLoadingAttempts } = usePhraseAttempts();
  const { mutate: archivePhrase } = useArchivePracticePhrase();
  const { mutate: deletePhrase } = useDeletePracticePhrase();

  const menuItems = useMemo(
    () => buildTodayMenu(phrases ?? [], attempts ?? []),
    [phrases, attempts],
  );
  const todayPick = pickTodayPick(menuItems);

  const isLoading = isLoadingPhrases || isLoadingAttempts;

  const activePhraseId = usePracticeStore(
    (s) => s.activePhrasePractice?.phrase.id ?? null,
  );
  const setActivePhrasePractice = usePracticeStore((s) => s.setActivePhrasePractice);

  // 練習中のフレーズを消したら、結果が消えたフレーズへ記録されないよう練習中状態も解除する
  const clearIfActive = useCallback(
    (phraseId: string) => {
      if (activePhraseId === phraseId) {
        setActivePhrasePractice(null);
      }
    },
    [activePhraseId, setActivePhrasePractice],
  );

  const handleLongPress = useCallback(
    (phrase: PracticePhrase) => {
      Alert.alert(phrase.name, "このフレーズをどうしますか？", [
        {
          text: "アーカイブ",
          onPress: () =>
            Alert.alert(
              "アーカイブの確認",
              `「${phrase.name}」を練習メニューと進捗一覧から外します。記録は残りますが、アプリ内で元に戻す操作は現在ありません。`,
              [
                { text: "キャンセル", style: "cancel" },
                {
                  text: "アーカイブする",
                  onPress: () =>
                    archivePhrase(phrase.id, { onSuccess: () => clearIfActive(phrase.id) }),
                },
              ],
            ),
        },
        {
          text: "削除",
          style: "destructive",
          onPress: () =>
            Alert.alert("削除の確認", `「${phrase.name}」を削除します。この操作は取り消せません。`, [
              { text: "キャンセル", style: "cancel" },
              {
                text: "削除する",
                style: "destructive",
                onPress: () =>
                  deletePhrase(phrase.id, { onSuccess: () => clearIfActive(phrase.id) }),
              },
            ]),
        },
        { text: "キャンセル", style: "cancel" },
      ]);
    },
    [archivePhrase, deletePhrase, clearIfActive],
  );

  return (
    <View
      className="bg-surface-container-lowest"
      style={[cardStyle, cardShadowStyle, { marginBottom: 16, gap: 12 }]}
    >
      <Text
        className="text-headline-lg"
        style={{ color: colors.onSurface, fontWeight: "700" }}
      >
        今日の練習メニュー
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : menuItems.length === 0 ? (
        <View style={{ gap: 12, paddingVertical: 8 }}>
          <Text className="text-on-surface-variant text-body-md">
            1. 動画を読み込む → 2. 区間のA点・B点を決める → 3.「フレーズとして保存」
          </Text>
          <Pressable
            onPress={onTryPreset}
            className="items-center active:opacity-90"
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 9999,
              backgroundColor: colors.primary,
            }}
            accessibilityRole="button"
            accessibilityLabel="サンプル動画で試す"
          >
            <Text
              className="text-label-sm"
              style={{ color: colors.onPrimary, fontWeight: "700" }}
            >
              サンプル動画で試す
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {menuItems.map((entry) => {
            const { phrase, latest, todayTargetBpm, priority } = entry;
            const isPick = entry === todayPick;
            return (
              <Pressable
                key={phrase.id}
                onPress={() => onStartPhrase(phrase, todayTargetBpm)}
                onLongPress={() => handleLongPress(phrase)}
                className="flex-row items-center active:opacity-80"
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: isPick ? 16 : 12,
                  borderRadius: 12,
                  gap: 12,
                  backgroundColor: isPick
                    ? `${colors.primaryContainer}26`
                    : colors.surfaceContainerLow,
                  borderWidth: isPick ? 1 : 0,
                  borderColor: colors.primary,
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  isPick
                    ? `今日の1本、${phrase.name}の練習を開始`
                    : `${phrase.name}の練習を開始`
                }
                accessibilityHint="長押しでアーカイブ・削除"
              >
                <View
                  className="items-center justify-center"
                  style={{
                    width: isPick ? 44 : 36,
                    height: isPick ? 44 : 36,
                    borderRadius: isPick ? 22 : 18,
                    backgroundColor: isPick ? colors.primary : `${colors.primaryContainer}33`,
                  }}
                >
                  <Icon
                    name="play_arrow"
                    size={isPick ? 22 : 18}
                    color={isPick ? colors.onPrimary : colors.primary}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  {isPick && (
                    <Text
                      className="text-label-sm"
                      style={{ color: colors.primary, fontWeight: "700" }}
                    >
                      今日の1本
                    </Text>
                  )}
                  <Text
                    className="text-body-md"
                    style={{
                      color: colors.onSurface,
                      fontWeight: isPick ? "700" : "600",
                      fontSize: isPick ? 18 : undefined,
                    }}
                    numberOfLines={1}
                  >
                    {phrase.name}
                  </Text>
                  <Text
                    className="text-label-sm"
                    style={{ color: colors.onSurfaceVariant }}
                  >
                    {priority === "graduated" ? "卒業・" : ""}
                    {latest ? `前回 ${latest.bpm}` : "未練習"} → 今日は{" "}
                    {todayTargetBpm} BPM
                  </Text>
                  {isPick && priority !== "graduated" && (
                    <Text
                      className="text-label-sm"
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      {TODAY_PICK_REASONS[priority]}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
