/**
 * 進捗画面
 *
 * iPhone 16 Pro で縦スクロールなしの1画面に収める構成:
 * ヘッダー(最近の記録/シェア/設定) → 今週のカード（練習日数+連続日数+週バー）
 * → 上達中/卒業のセグメント → フレーズ一覧（最大4行） → 今日の1本を開くボタン。
 * 手動記録の追加・全件表示はシートへ逃がす。
 */

import { useCallback, useMemo, useState } from "react";
import { View, Text, Share, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "@/shared/components/atoms/Icon";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { Button } from "@/shared/components/atoms/Button";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/atoms/SegmentedControl";
import { Card } from "@/shared/components/molecules/Card";
import { ScreenFrame } from "@/shared/components/molecules/ScreenFrame";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import type { PracticeSession, PracticeStats } from "@/shared/types/models";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { usePracticeStore } from "@/stores/practice";
import { usePracticeSessions } from "@/features/progress/api/usePracticeSessions";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useDeletePracticeSession } from "@/features/progress/api/useDeletePracticeSession";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { buildTodayMenu, pickTodayPick } from "@/features/practice/lib/progression";
import { calcStats } from "@/features/progress/lib/calcStats";
import { usePhraseProgressSummaries } from "@/features/progress/hooks/usePhraseProgressSummaries";
import { WeekBarChart } from "@/features/progress/components/WeekBarChart";
import { AddSessionModal } from "@/features/progress/components/AddSessionModal";
import { PhraseProgressList } from "@/features/progress/components/PhraseProgressList";
import { GraduatedPhraseList } from "@/features/progress/components/GraduatedPhraseList";
import { RecentSessionsSheet } from "@/features/progress/components/RecentSessionsSheet";
import { AllPhrasesProgressSheet } from "@/features/progress/components/AllPhrasesProgressSheet";

/** 画面本体で表示するフレーズ一覧の上限行数（超過時は最終行が「他N本を見る」になる） */
const LIST_MAX_ROWS = 4;

type PhraseKind = "active" | "graduated";

export function ProgressScreen() {
  const router = useRouter();
  const startPhrasePractice = usePracticeStore((s) => s.startPhrasePractice);

  const { data: sessions = [] } = usePracticeSessions();
  const { data: attempts = [] } = usePhraseAttempts();
  const { data: phrases = [] } = usePracticePhrases();
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const { mutateAsync: deleteSession } = useDeletePracticeSession();
  const { inProgress, graduated } = usePhraseProgressSummaries();

  const [phraseKind, setPhraseKind] = useState<PhraseKind>("active");
  const [showRecentSheet, setShowRecentSheet] = useState(false);
  const [showAllPhrasesSheet, setShowAllPhrasesSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const stats = useMemo<PracticeStats>(() => calcStats(sessions, attempts), [sessions, attempts]);

  const todayPick = useMemo(
    () => pickTodayPick(buildTodayMenu(phrases, attempts)),
    [phrases, attempts],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSession(id);
    },
    [deleteSession],
  );

  const handleSaveSession = useCallback(
    async (session: PracticeSession) => {
      await saveSession(session);
    },
    [saveSession],
  );

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
    if (todayPick) {
      startPhrasePractice(todayPick.phrase, todayPick.todayTargetBpm);
    }
    router.push("/(tabs)/practice");
  }, [todayPick, startPhrasePractice, router]);

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
  const showMoreCount = activeCount > LIST_MAX_ROWS ? activeCount - (LIST_MAX_ROWS - 1) : 0;
  const listCap = showMoreCount > 0 ? LIST_MAX_ROWS - 1 : LIST_MAX_ROWS;

  return (
    <ErrorBoundary>
      <ScreenFrame>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
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
            <View>
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
              <View style={styles.streakBadge} accessibilityLabel={`連続${stats.streakDays}日`}>
                <Icon name="bolt" size={14} color={semantic.streak} />
                <Text style={styles.streakText} maxFontSizeMultiplier={1.3}>
                  {stats.streakDays}日連続
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.weekChart}>
            <WeekBarChart weeklyPracticedDays={stats.weeklyPracticedDays} />
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

        {/* フレーズ一覧 */}
        <Card elevation="low" padding={12} style={styles.listCard}>
          {phraseKind === "active" ? (
            <PhraseProgressList items={inProgress} maxItems={listCap} />
          ) : (
            <GraduatedPhraseList items={graduated} maxItems={listCap} />
          )}
          {showMoreCount > 0 ? (
            <Button
              label={`他${showMoreCount}本を見る`}
              variant="ghost"
              size="sm"
              onPress={() => setShowAllPhrasesSheet(true)}
              style={styles.showMoreButton}
            />
          ) : null}
        </Card>

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
          onAddPress={() => setShowAddModal(true)}
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
  listCard: {
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
