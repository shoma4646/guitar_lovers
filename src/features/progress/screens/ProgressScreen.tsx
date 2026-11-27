/**
 * 進捗画面
 *
 * iPhone 16 Pro で縦スクロールなしの1画面に収める構成:
 * ヘッダー(最近の記録/シェア/設定) → 今週のカード（練習日数+連続日数+週バー）
 * → 上達中/卒業のセグメント → フレーズ一覧（余った高さに収まる行数） → 今日の1本を開くボタン。
 * 手動記録の追加・全件表示はシートへ逃がす。
 * 記録の読み出しに失敗したときは、0件の表示ではなく読み込みエラーと再読み込みだけを出す。
 */

import { useCallback, useMemo, useState } from "react";
import { View, Text, Share, StyleSheet, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/shared/components/atoms/Icon";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { Button } from "@/shared/components/atoms/Button";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/atoms/SegmentedControl";
import { Card } from "@/shared/components/molecules/Card";
import { ScreenFrame } from "@/shared/components/molecules/ScreenFrame";
import { ReadErrorCard } from "@/shared/components/molecules/ReadErrorCard";
import { hasReadFailure, refetchAll } from "@/shared/lib/readFailure";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import type { PracticeSession, PracticeStats } from "@/shared/types/models";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { useRunAfterDismiss } from "@/shared/hooks/useRunAfterDismiss";
import { useLocalDay } from "@/shared/hooks/useLocalDay";
import { localDayToDate } from "@/shared/lib/localDay";
import { usePracticeStore } from "@/stores/practice";
import { useConfirmPhraseSwitch } from "@/features/practice/hooks/useConfirmPhraseSwitch";
import { usePracticeSessions } from "@/features/progress/api/usePracticeSessions";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useDeletePracticeSession } from "@/features/progress/api/useDeletePracticeSession";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { buildTodayMenu, pickTodayPick } from "@/features/practice/lib/progression";
import { calcStats } from "@/features/progress/lib/calcStats";
import { fitListRows, legacyListRows } from "@/features/progress/lib/fitListRows";
import { usePhraseProgressSummaries } from "@/features/progress/hooks/usePhraseProgressSummaries";
import { WeekBarChart } from "@/features/progress/components/WeekBarChart";
import { AddSessionModal } from "@/features/progress/components/AddSessionModal";
import { PhraseProgressList } from "@/features/progress/components/PhraseProgressList";
import { GraduatedPhraseList } from "@/features/progress/components/GraduatedPhraseList";
import { RecentSessionsSheet } from "@/features/progress/components/RecentSessionsSheet";
import { AllPhrasesProgressSheet } from "@/features/progress/components/AllPhrasesProgressSheet";

/** 一覧の高さを測る前に表示する上限行数（超過時は最終行が「他N本を見る」になる） */
const LIST_UNMEASURED_MAX_ROWS = 4;

/** 高さが足りなくても一覧に表示する最低行数 */
const LIST_MIN_ROWS = 1;

const LIST_CARD_PADDING = 12;

/** 「他N本を見る」（sm ボタン）を測る前に使う高さ */
const SHOW_MORE_DEFAULT_HEIGHT = 44;

type PhraseKind = "active" | "graduated";

export function ProgressScreen() {
  const router = useRouter();
  const startPhrasePractice = usePracticeStore((s) => s.startPhrasePractice);
  const activePractice = usePracticeStore((s) => s.activePhrasePractice);
  const confirmSwitch = useConfirmPhraseSwitch();

  const sessionsQuery = usePracticeSessions();
  const attemptsQuery = usePhraseAttempts();
  const phrasesQuery = usePracticePhrases();
  const { data: sessions = [] } = sessionsQuery;
  const { data: attempts = [] } = attemptsQuery;
  const { data: phrases = [] } = phrasesQuery;
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const { mutate: deleteSession } = useDeletePracticeSession();
  const { inProgress, graduated } = usePhraseProgressSummaries();

  const [phraseKind, setPhraseKind] = useState<PhraseKind>("active");
  const [showRecentSheet, setShowRecentSheet] = useState(false);
  const [showAllPhrasesSheet, setShowAllPhrasesSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [listAreaHeight, setListAreaHeight] = useState<number | undefined>(undefined);
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined);
  const [showMoreHeight, setShowMoreHeight] = useState(SHOW_MORE_DEFAULT_HEIGHT);
  const { schedule: runAfterRecentSheetDismissed, flush: handleRecentSheetDismissed } =
    useRunAfterDismiss();

  const localDay = useLocalDay();

  const stats = useMemo<PracticeStats>(
    () => calcStats(sessions, attempts, localDayToDate(localDay)),
    [sessions, attempts, localDay],
  );

  const todayPick = useMemo(
    () => pickTodayPick(buildTodayMenu(phrases, attempts, localDayToDate(localDay))),
    [phrases, attempts, localDay],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteSession(id);
    },
    [deleteSession],
  );

  const handleSaveSession = useCallback(
    async (session: PracticeSession) => {
      await saveSession(session);
    },
    [saveSession],
  );

  const handleAddPressInRecentSheet = useCallback(() => {
    runAfterRecentSheetDismissed(() => setShowAddModal(true));
    setShowRecentSheet(false);
  }, [runAfterRecentSheetDismissed]);

  const handleShare = useCallback(async () => {
    const text = [
      "Guitar Lovers 練習記録",
      `今週の練習日数: ${stats.weeklyPracticeDays}/7日`,
      stats.streakDays > 0 ? `連続練習日数: ${stats.streakDays}日` : undefined,
    ]
      .filter((line): line is string => line !== undefined)
      .join("\n");

    try {
      await Share.share({ message: text, title: "練習記録をシェア" });
    } catch {
      // ignore
    }
  }, [stats]);

  const handleOpenToday = useCallback(() => {
    if (!todayPick) {
      router.push("/(tabs)/practice");
      return;
    }
    // すでに同じフレーズを練習中なら、completedReps/startedAtをリセットしないよう
    // startPhrasePracticeを呼ばずに練習タブへ戻るだけにする
    if (activePractice?.phrase.id === todayPick.phrase.id) {
      router.push("/(tabs)/practice");
      return;
    }
    confirmSwitch(() => {
      startPhrasePractice(todayPick.phrase, todayPick.today.targetBeforeToday);
      router.push("/(tabs)/practice");
    });
  }, [todayPick, activePractice, confirmSwitch, startPhrasePractice, router]);

  const segmentItems: SegmentedItem<PhraseKind>[] = [
    { value: "active", label: "上達中", suffix: `${inProgress.length}` },
    {
      value: "graduated",
      label: "卒業",
      suffix: `${graduated.length}`,
      suffixColor: semantic.graduated,
    },
  ];

  const activeCount = phraseKind === "active" ? inProgress.length : graduated.length;
  const { rows: listCap, moreCount: showMoreCount } =
    listAreaHeight !== undefined && rowHeight !== undefined
      ? fitListRows({
          availableHeight: listAreaHeight - LIST_CARD_PADDING * 2,
          rowHeight,
          moreHeight: showMoreHeight,
          total: activeCount,
          minRows: LIST_MIN_ROWS,
        })
      : legacyListRows(activeCount, LIST_UNMEASURED_MAX_ROWS);

  const handleListAreaLayout = (event: LayoutChangeEvent) => {
    setListAreaHeight(event.nativeEvent.layout.height);
  };
  const handleShowMoreLayout = (event: LayoutChangeEvent) => {
    setShowMoreHeight(event.nativeEvent.layout.height);
  };

  if (hasReadFailure(sessionsQuery, attemptsQuery, phrasesQuery)) {
    return (
      <ErrorBoundary>
        <ScreenFrame>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
              進捗
            </Text>
            <IconButton
              name="settings"
              accessibilityLabel="設定を開く"
              onPress={() => router.push("/settings")}
            />
          </View>
          <ReadErrorCard onRetry={() => refetchAll(sessionsQuery, attemptsQuery, phrasesQuery)} />
        </ScreenFrame>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenFrame>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
            進捗
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              name="history"
              accessibilityLabel={`最近の記録 ${sessions.length}件`}
              onPress={() => setShowRecentSheet(true)}
            />
            <IconButton
              name="share"
              accessibilityLabel="今週の記録をシェア"
              onPress={handleShare}
            />
            <IconButton
              name="settings"
              accessibilityLabel="設定を開く"
              onPress={() => router.push("/settings")}
            />
          </View>
        </View>

        {/* 今週のカード */}
        <Card elevation="low" padding={12}>
          <View style={styles.weekHeader}>
            <View
              accessible
              accessibilityLabel={`今週の練習日数 ${stats.weeklyPracticeDays}日（7日中）`}
            >
              <Text style={styles.weekLabel}>今週の練習日数</Text>
              <View style={styles.weekValueRow}>
                <Text style={styles.weekValue} maxFontSizeMultiplier={1.2}>
                  {stats.weeklyPracticeDays}
                </Text>
                <Text style={styles.weekValueSuffix} maxFontSizeMultiplier={1.2}>
                  / 7日
                </Text>
              </View>
            </View>
            {stats.streakDays > 0 ? (
              <View style={styles.streakBadge} accessible accessibilityLabel={`連続${stats.streakDays}日`}>
                <Icon name="bolt" size={14} color={semantic.streak} />
                <Text style={styles.streakText} maxFontSizeMultiplier={1.3}>
                  {stats.streakDays}日連続
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.weekChart}>
            <WeekBarChart
              weeklyPracticedDays={stats.weeklyPracticedDays}
              todayIndex={stats.todayWeekIndex}
            />
          </View>
        </Card>

        {/* 上達中/卒業セグメント */}
        <SegmentedControl
          items={segmentItems}
          value={phraseKind}
          onChange={setPhraseKind}
          role="tab"
          accessibilityLabel="進捗の種類"
        />

        {/* フレーズ一覧。余った高さを測る領域の中で、カード自体は中身の高さにする */}
        <View testID="phrase-list-area" style={styles.listArea} onLayout={handleListAreaLayout}>
          <Card elevation="low" padding={LIST_CARD_PADDING}>
            {phraseKind === "active" ? (
              <PhraseProgressList
                items={inProgress}
                maxItems={listCap}
                onRowLayout={setRowHeight}
              />
            ) : (
              <GraduatedPhraseList
                items={graduated}
                maxItems={listCap}
                onRowLayout={setRowHeight}
              />
            )}
            {showMoreCount > 0 ? (
              <View onLayout={handleShowMoreLayout}>
                <Button
                  label={`他${showMoreCount}本を見る`}
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowAllPhrasesSheet(true)}
                  style={styles.showMoreButton}
                />
              </View>
            ) : null}
          </Card>
        </View>

        {/* 今日の1本 */}
        <View style={styles.bottomArea}>
          <Button
            label={todayPick ? "今日の1本を開く" : "フレーズを追加する"}
            onPress={handleOpenToday}
            variant="primary"
            size="lg"
            icon={todayPick ? "play_arrow" : "add"}
            fullWidth
          />
          {todayPick ? (
            <Text style={styles.bottomCaption} numberOfLines={1}>
              {todayPick.phrase.name}
            </Text>
          ) : null}
        </View>

        <RecentSessionsSheet
          visible={showRecentSheet}
          onClose={() => setShowRecentSheet(false)}
          sessions={sessions}
          onDelete={handleDelete}
          onAddPress={handleAddPressInRecentSheet}
          onDismissed={handleRecentSheetDismissed}
        />

        <AllPhrasesProgressSheet
          visible={showAllPhrasesSheet}
          onClose={() => setShowAllPhrasesSheet(false)}
          inProgress={inProgress}
          graduated={graduated}
          initialKind={phraseKind}
        />

        <AddSessionModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveSession}
        />
      </ScreenFrame>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  weekValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  weekValue: {
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  weekValueSuffix: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: colors.secondaryFixed,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "800",
    color: semantic.streak,
    fontVariant: ["tabular-nums"],
  },
  weekChart: {
    marginTop: 12,
  },
  listArea: {
    flex: 1,
  },
  showMoreButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
  },
  bottomArea: {
    gap: 4,
  },
  bottomCaption: {
    textAlign: "center",
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
