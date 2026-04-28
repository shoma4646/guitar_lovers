/**
 * 履歴画面
 * 練習記録の統計・週次バーチャート・セッション一覧・新規記録追加を提供する。
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/constants/colors";
import type { PracticeSession, PracticeStats } from "@/shared/types/models";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { usePracticeSessions } from "@/features/history/api/usePracticeSessions";
import { useSavePracticeSession } from "@/features/history/api/useSavePracticeSession";
import { useDeletePracticeSession } from "@/features/history/api/useDeletePracticeSession";
import { calcStats } from "@/features/history/lib/calcStats";
import { formatDurationLong } from "@/features/history/lib/formatters";
import { StatCard } from "@/features/history/components/StatCard";
import { WeekBarChart } from "@/features/history/components/WeekBarChart";
import { SessionRow } from "@/features/history/components/SessionRow";
import { AddSessionModal } from "@/features/history/components/AddSessionModal";

const INITIAL_STATS: PracticeStats = {
  weeklyDuration: 0,
  streakDays: 0,
  totalDuration: 0,
  totalSessions: 0,
  weeklyData: [0, 0, 0, 0, 0, 0, 0],
};

/** 履歴画面コンポーネント */
export function HistoryScreen() {
  const { data: sessions = [] } = usePracticeSessions();
  const { mutateAsync: saveSession } = useSavePracticeSession();
  const { mutateAsync: deleteSession } = useDeletePracticeSession();
  const [showAddModal, setShowAddModal] = useState(false);

  const stats = useMemo<PracticeStats>(
    () => (sessions.length === 0 ? INITIAL_STATS : calcStats(sessions)),
    [sessions],
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
      `今週の練習: ${formatDurationLong(stats.weeklyDuration)}`,
      `連続日数: ${stats.streakDays}日`,
      `累計時間: ${formatDurationLong(stats.totalDuration)}`,
      `総回数: ${stats.totalSessions}回`,
    ].join("\n");

    try {
      await Share.share({ message: text, title: "練習記録をシェア" });
    } catch {
      // シェアがキャンセルされた場合は何もしない
    }
  }, [stats]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsGrid}>
            <StatCard
              label="今週の練習"
              value={formatDurationLong(stats.weeklyDuration)}
              icon="calendar-outline"
              accentColor={colors.primary}
            />
            <StatCard
              label="連続日数"
              value={`${stats.streakDays}日`}
              icon="flame-outline"
              accentColor={colors.secondary}
            />
            <StatCard
              label="累計時間"
              value={formatDurationLong(stats.totalDuration)}
              icon="time-outline"
              accentColor={colors.tuned}
            />
            <StatCard
              label="総回数"
              value={`${stats.totalSessions}回`}
              icon="musical-notes-outline"
              accentColor={colors.error}
            />
          </View>

          <WeekBarChart weeklyData={stats.weeklyData} />

          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
            accessibilityRole="button"
            accessibilityLabel="練習記録をシェア"
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={colors.secondary}
            />
            <Text style={styles.shareButtonText}>練習記録をシェア</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              練習記録 ({sessions.length})
            </Text>
            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="musical-notes-outline"
                  size={40}
                  color={colors.textGray}
                />
                <Text style={styles.emptyText}>練習記録がありません</Text>
                <Text style={styles.emptySubText}>
                  右下のボタンから記録を追加してください
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="練習を記録する"
        >
          <Ionicons name="add" size={28} color={colors.textWhite} />
        </TouchableOpacity>

        <AddSessionModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveSession}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    backgroundColor: colors.bgLightDark,
    borderColor: colors.secondary,
  },
  shareButtonText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: colors.textGray,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  list: {
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 40,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: colors.bgLightDark,
  },
  emptyText: {
    color: colors.textGray,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    color: colors.textGray + "AA",
    fontSize: 13,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: colors.primary,
  },
});
