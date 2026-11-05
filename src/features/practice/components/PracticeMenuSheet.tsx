/**
 * 練習の道具シート（メトロノーム・タイマー・今日のメニュー・ブックマーク）
 *
 * 動画読み込み前はPracticeScreenのヘッダーから、読み込み後はPracticeTabのヘッダーから、
 * どちらも同じシートを開く（開閉状態はusePracticeStoreのtoolsSheetOpenで一元管理）。
 * メトロノームはPracticeTab側のuseMetronomeEngineの状態をpropsで受け取るだけで、
 * ここで音出しロジックは持たない。
 */

import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BottomSheet } from "@/shared/components/molecules/BottomSheet";
import { ReadErrorCard } from "@/shared/components/molecules/ReadErrorCard";
import { hasReadFailure, refetchAll } from "@/shared/lib/readFailure";
import { Button } from "@/shared/components/atoms/Button";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { Icon } from "@/shared/components/atoms/Icon";
import { Divider } from "@/shared/components/atoms/Divider";
import { colors, radius } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { buildTodayMenu, resolveCurrentBpm } from "@/features/practice/lib/progression";
import {
  buildPhraseRowLabel,
  PHRASE_ROW_HINT,
  phraseRowAccessibilityActionProps,
} from "@/features/practice/lib/phraseRowLabel";
import { usePhraseLongPressActions } from "@/features/practice/hooks/usePhraseLongPressActions";
import { formatDuration } from "@/features/practice/lib/formatters";
import { useLocalDay } from "@/shared/hooks/useLocalDay";
import { localDayToDate } from "@/shared/lib/localDay";
import { MetronomeControls } from "./MetronomeControls";
import type { Bookmark, PhraseAttempt, PracticePhrase } from "@/shared/types/models";

type Props = {
  visible: boolean;
  onClose: () => void;
  activePhraseId: string | null;
  onSelectPhrase: (phrase: PracticePhrase, startBpm: number) => void;
  metronomeBpm: number;
  metronomeEnabled: boolean;
  metronomeBeatsPerBar: number;
  onStepMetronomeBpm: (delta: number) => void;
  onToggleMetronome: () => void;
  displaySeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onSaveSession: () => void;
  /** 練習セッションの保存中か。保存中は「記録」を押せなくする */
  isSavingSession: boolean;
  /** 動画が読み込まれているか。ブックマーク・動画を閉じる、の表示可否を切り替える */
  hasVideo: boolean;
  bookmarks: Bookmark[];
  onAddBookmark: () => void;
  onRemoveBookmark: (id: string) => void;
  /** ブックマークの位置（秒）へ動画を移動する */
  onSeekBookmark: (time: number) => void;
  onOpenAddVideo: () => void;
  onCloseVideo: () => void;
  /** シートが閉じ終わった後に呼ぶ */
  onDismissed?: () => void;
};

export function PracticeMenuSheet({
  visible,
  onClose,
  activePhraseId,
  onSelectPhrase,
  metronomeBpm,
  metronomeEnabled,
  metronomeBeatsPerBar,
  onStepMetronomeBpm,
  onToggleMetronome,
  displaySeconds,
  isTimerRunning,
  onToggleTimer,
  onSaveSession,
  isSavingSession,
  hasVideo,
  bookmarks,
  onAddBookmark,
  onRemoveBookmark,
  onSeekBookmark,
  onOpenAddVideo,
  onCloseVideo,
  onDismissed,
}: Props) {
  const phrasesQuery = usePracticePhrases();
  const attemptsQuery = usePhraseAttempts();
  const { data: phrases } = phrasesQuery;
  const { data: attempts } = attemptsQuery;
  const handleLongPress = usePhraseLongPressActions();
  const readFailed = hasReadFailure(phrasesQuery, attemptsQuery);

  const localDay = useLocalDay();
  const menuItems = useMemo(
    () => (visible ? buildTodayMenu(phrases ?? [], attempts ?? [], localDayToDate(localDay)) : []),
    [visible, phrases, attempts, localDay],
  );
  const attemptsByPhraseId = useMemo(() => {
    const map = new Map<string, PhraseAttempt[]>();
    for (const attempt of attempts ?? []) {
      const list = map.get(attempt.phraseId);
      if (list) list.push(attempt);
      else map.set(attempt.phraseId, [attempt]);
    }
    return map;
  }, [attempts]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="メニューと道具"
      onDismissed={onDismissed}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
        <View style={{ paddingBottom: 8, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant }}>
              メトロノーム
            </Text>
            <MetronomeControls
              bpm={metronomeBpm}
              enabled={metronomeEnabled}
              beatsPerBar={metronomeBeatsPerBar}
              onStepBpm={onStepMetronomeBpm}
              onToggleEnabled={onToggleMetronome}
            />
          </View>

          <Divider />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant }}>練習タイマー</Text>
              <Text
                style={{ fontSize: 28, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] }}
              >
                {formatDuration(displaySeconds)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <IconButton
                name={isTimerRunning ? "pause" : "play_arrow"}
                accessibilityLabel={isTimerRunning ? "タイマーを一時停止" : "タイマーを計測開始"}
                onPress={onToggleTimer}
                color={colors.primary}
              />
              <Button label="記録" onPress={onSaveSession} variant="tonal" size="sm" disabled={isSavingSession} />
            </View>
          </View>

          <Divider />

          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant, marginBottom: 4 }}>
              今日のメニュー
            </Text>
            {readFailed ? (
              <ReadErrorCard
                title="フレーズを読み込めませんでした"
                onRetry={() => refetchAll(phrasesQuery, attemptsQuery)}
              />
            ) : menuItems.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, paddingVertical: 12 }}>
                保存したフレーズはまだありません
              </Text>
            ) : (
              menuItems.map((entry, index) => {
                const phraseAttempts = attemptsByPhraseId.get(entry.phrase.id) ?? [];
                const { targetBeforeToday } = entry.today;
                const active = entry.phrase.id === activePhraseId;
                const currentBpm = resolveCurrentBpm(entry.phrase.currentBpm, phraseAttempts);
                return (
                  <Pressable
                    key={entry.phrase.id}
                    onPress={() => {
                      onSelectPhrase(entry.phrase, targetBeforeToday);
                      onClose();
                    }}
                    onLongPress={() => handleLongPress(entry.phrase)}
                    className="active:opacity-80"
                    style={{
                      height: 52,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.divider,
                      backgroundColor: active ? colors.surfaceContainerLow : "transparent",
                      borderRadius: active ? radius.sm : 0,
                      paddingHorizontal: active ? 8 : 0,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={buildPhraseRowLabel(entry, currentBpm)}
                    accessibilityHint={PHRASE_ROW_HINT}
                    {...phraseRowAccessibilityActionProps((action) => handleLongPress(entry.phrase, action))}
                  >
                    {active ? <Icon name="check_circle" size={18} color={colors.primary} /> : <View style={{ width: 18 }} />}
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.onSurface }} numberOfLines={1}>
                      {entry.priority === "graduated" && (
                        <Text style={{ color: colors.secondary }}>卒業・</Text>
                      )}
                      {entry.phrase.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}>
                      {currentBpm} → {targetBeforeToday}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {hasVideo && (
            <>
              <Divider />

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant }}>
                    ブックマーク（{bookmarks.length}件）
                  </Text>
                  <IconButton name="add" accessibilityLabel="ブックマークを追加" onPress={onAddBookmark} color={colors.primary} />
                </View>
                {bookmarks.length === 0 ? (
                  <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>ブックマークはありません</Text>
                ) : (
                  bookmarks.map((bm) => (
                    <View
                      key={bm.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingRight: 12,
                        borderRadius: radius.sm,
                        backgroundColor: colors.surfaceContainerLow,
                      }}
                    >
                      <Pressable
                        onPress={() => {
                          onSeekBookmark(bm.time);
                          onClose();
                        }}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          height: 44,
                          paddingHorizontal: 12,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${bm.label ?? formatDuration(bm.time)}、${formatDuration(bm.time)}へ移動`}
                      >
                        <Icon name="bookmark" size={16} color={colors.primary} />
                        <Text style={{ flex: 1, fontSize: 14, color: colors.onSurface }} numberOfLines={1}>
                          {bm.label ?? formatDuration(bm.time)}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontVariant: ["tabular-nums"] }}>
                          {formatDuration(bm.time)}
                        </Text>
                      </Pressable>
                      <IconButton
                        name="close"
                        size={16}
                        accessibilityLabel="ブックマークを削除"
                        onPress={() => onRemoveBookmark(bm.id)}
                      />
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          <Divider />

          <Button label="別の動画を開く" onPress={onOpenAddVideo} variant="outline" fullWidth icon="add" />
          {hasVideo && (
            <Button label="動画を閉じる" onPress={onCloseVideo} variant="ghost" fullWidth icon="close" />
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
