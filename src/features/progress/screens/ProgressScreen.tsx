/**
 * 進捗画面（Stitch modern_2 風のレイアウトを踏襲）
 *
 * - AppBar: プロフィール + "練習の記録" + settings
 * - フレーズの上達（BPM推移）: 保存済みフレーズがある場合のみ表示、最上段の主役
 * - 統計: 主指標「今週の練習日数」の大カード + 今週の時間 / 累計時間 / 回数の補助カード
 * - WEEKLY RHYTHM バーチャート
 * - RECENT SESSIONS リスト
 * - FAB（右下に追加ボタン）
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import type { PracticeSession, PracticeStats } from "@/shared/types/models";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { usePracticeSessions } from "@/features/progress/api/usePracticeSessions";
import { useSavePracticeSession } from "@/features/progress/api/useSavePracticeSession";
import { useDeletePracticeSession } from "@/features/progress/api/useDeletePracticeSession";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { calcStats } from "@/features/progress/lib/calcStats";
import { formatDurationLong } from "@/features/progress/lib/formatters";
import { StatCard } from "@/features/progress/components/StatCard";
import { WeekBarChart } from "@/features/progress/components/WeekBarChart";
import { SessionRow } from "@/features/progress/components/SessionRow";
import { AddSessionModal } from "@/features/progress/components/AddSessionModal";
import { PhraseProgressList } from "@/features/progress/components/PhraseProgressList";
import { GraduatedPhraseList } from "@/features/progress/components/GraduatedPhraseList";

export function ProgressScreen() {
  const { data: sessions = [] } = usePracticeSessions();
  const { data: attempts = [] } = usePhraseAttempts();
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const { mutateAsync: deleteSession } = useDeletePracticeSession();
  const [showAddModal, setShowAddModal] = useState(false);

  const stats = useMemo<PracticeStats>(
    () => calcStats(sessions, attempts),
    [sessions, attempts],
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

  return (
    <ErrorBoundary>
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-margin-mobile h-16">
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center">
              <Icon name="school" size={20} color={colors.onSurfaceVariant} />
            </View>
            <Text className="font-bold text-headline-lg text-on-surface">
              練習の記録
            </Text>
          </View>
          <Pressable
            onPress={handleShare}
            className="active:opacity-70"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="練習記録をシェア"
          >
            <Icon name="share" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* フレーズの上達（BPM推移） */}
          <PhraseProgressList />
          <GraduatedPhraseList />

          {/* Stats: 主指標 + 補助 */}
          <View style={styles.statsGrid}>
            <View className="flex-row">
              <StatCard
                label="今週の練習日数"
                value={`${stats.weeklyPracticeDays}/7日`}
                emphasized
                caption={stats.streakDays > 0 ? `連続${stats.streakDays}日` : undefined}
              />
            </View>
            <View className="flex-row" style={{ gap: 12, marginTop: 12 }}>
              <StatCard
                label="THIS WEEK"
                value={formatDurationLong(stats.weeklyDuration)}
              />
              <StatCard
                label="HOURS"
                value={formatDurationLong(stats.totalDuration)}
              />
              <StatCard label="SESSIONS" value={`${stats.totalSessions}`} />
            </View>
          </View>

          {/* Weekly Rhythm Chart */}
          <View style={{ marginBottom: 24 }}>
            <WeekBarChart weeklyPracticedDays={stats.weeklyPracticedDays} />
          </View>

          {/* Recent Sessions */}
          <Text
            className="text-label-sm mb-sm"
            style={{
              color: colors.outline,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontWeight: "600",
              paddingHorizontal: 4,
            }}
          >
            RECENT SESSIONS
          </Text>
          {sessions.length === 0 ? (
            <View
              className="bg-surface-container-lowest items-center"
              style={[styles.emptyState, shadowStyle]}
            >
              <Icon name="music_note" size={40} color={colors.outline} />
              <Text
                className="text-headline-lg mt-md"
                style={{ color: colors.onSurface, fontWeight: "700" }}
              >
                練習記録がありません
              </Text>
              <Text
                className="text-body-md mt-xs"
                style={{ color: colors.onSurfaceVariant, textAlign: "center" }}
              >
                右下のボタンから記録を追加してください
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <Pressable
          onPress={() => setShowAddModal(true)}
          className="active:scale-90"
          style={[styles.fab, fabShadow]}
          accessibilityRole="button"
          accessibilityLabel="練習を記録する"
        >
          <Icon name="add" size={28} color={colors.onPrimary} />
        </Pressable>

        <AddSessionModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveSession}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const shadowStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const fabShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  statsGrid: {
    marginBottom: 24,
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ae3026",
  },
});
