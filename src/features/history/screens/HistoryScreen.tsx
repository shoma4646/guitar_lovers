/**
 * 履歴画面
 * 練習記録の統計・週次バーチャート・セッション一覧・新規記録追加を提供する。
 * スワイプ削除はAlertダイアログで代替実装する。
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Share,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";
import { colors } from "@/shared/constants/colors";
import {
  getPracticeSessions,
  savePracticeSession,
  deletePracticeSession,
} from "@/shared/services/storage";
import type { PracticeSession, PracticeStats } from "@/shared/types/models";

/** 曜日ラベル（月〜日） */
const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 秒数を "h時間m分" 形式にフォーマットする
 */
function formatDurationLong(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}時間` : `${h}時間${rem}分`;
}

/**
 * 秒数を mm:ss 形式にフォーマットする
 */
function formatDurationShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * ISO日付文字列から "MM/DD" 形式を生成する
 */
function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * セッション一覧から練習統計を計算する
 */
function calcStats(sessions: PracticeSession[]): PracticeStats {
  const now = new Date();
  /** 今週の月曜日 */
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  /** 週別データ（月〜日） */
  const weeklyData = Array(7).fill(0) as number[];
  let weeklyDuration = 0;

  sessions.forEach((s) => {
    const date = new Date(s.date);
    const diffDays = Math.floor(
      (date.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays >= 0 && diffDays < 7) {
      weeklyData[diffDays] += s.duration;
      weeklyDuration += s.duration;
    }
  });

  /** 連続練習日数を計算する */
  const dateSet = new Set(
    sessions.map((s) => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let streakDays = 0;
  const checkDate = new Date(now);
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (dateSet.has(key)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    weeklyDuration,
    streakDays,
    totalDuration: sessions.reduce((sum, s) => sum + s.duration, 0),
    totalSessions: sessions.length,
    weeklyData,
  };
}

// ============================================================
// サブコンポーネント: 統計カード
// ============================================================

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  accentColor?: string;
}

/**
 * 統計カードコンポーネント
 */
function StatCard({ label, value, icon, accentColor = colors.primary }: StatCardProps) {
  return (
    <View
      style={[styles.statCard, { backgroundColor: colors.bgLightDark }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[styles.statIconWrap, { backgroundColor: accentColor + "22" }]}
      >
        <Ionicons name={icon as never} size={20} color={accentColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.textWhite }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textGray }]}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// サブコンポーネント: 週次バーチャート
// ============================================================

interface WeekBarChartProps {
  weeklyData: number[];
}

/**
 * 週次練習時間バーチャート（View基底、ライブラリ不使用）
 */
function WeekBarChart({ weeklyData }: WeekBarChartProps) {
  const maxVal = Math.max(...weeklyData, 1);
  const today = new Date();
  /** 今日の曜日インデックス（0=月曜） */
  const todayIdx = (today.getDay() + 6) % 7;

  return (
    <View
      style={[styles.chartContainer, { backgroundColor: colors.bgLightDark }]}
    >
      <Text style={[styles.chartTitle, { color: colors.textWhite }]}>
        今週の練習
      </Text>
      <View style={styles.chartBars}>
        {weeklyData.map((val, idx) => {
          const ratio = val / maxVal;
          const isToday = idx === todayIdx;
          const barColor = isToday ? colors.primary : colors.secondary + "88";

          return (
            <View key={idx} style={styles.chartBarColumn}>
              <Text
                style={[styles.chartBarValue, { color: colors.textGray }]}
              >
                {val > 0 ? Math.floor(val / 60) : ""}
              </Text>
              <View style={styles.chartBarBg}>
                <Animated.View
                  style={[
                    styles.chartBarFill,
                    {
                      height: `${Math.max(ratio * 100, val > 0 ? 4 : 0)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.chartBarLabel,
                  {
                    color: isToday ? colors.primary : colors.textGray,
                    fontWeight: isToday ? "700" : "400",
                  },
                ]}
              >
                {WEEK_DAYS[idx]}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.chartUnit, { color: colors.textGray }]}>
        単位: 分
      </Text>
    </View>
  );
}

// ============================================================
// サブコンポーネント: セッション行
// ============================================================

interface SessionRowProps {
  session: PracticeSession;
  onDelete: (id: string) => void;
}

/**
 * セッション一覧の行コンポーネント
 * 長押しで削除ダイアログを表示する
 */
function SessionRow({ session, onDelete }: SessionRowProps) {
  const handleLongPress = useCallback(() => {
    Alert.alert("削除確認", "この練習記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => onDelete(session.id),
      },
    ]);
  }, [session.id, onDelete]);

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={[styles.sessionRow, { backgroundColor: colors.bgLightDark }]}
      accessibilityRole="button"
      accessibilityHint="長押しで削除"
    >
      <View
        style={[styles.sessionIconWrap, { backgroundColor: colors.primary + "22" }]}
      >
        <Ionicons name="musical-notes" size={18} color={colors.primary} />
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionDate, { color: colors.textWhite }]}>
          {formatDateShort(session.date)}
        </Text>
        {session.notes ? (
          <Text
            style={[styles.sessionNotes, { color: colors.textGray }]}
            numberOfLines={1}
          >
            {session.notes}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.sessionDuration, { color: colors.secondary }]}>
        {formatDurationShort(session.duration)}
      </Text>
      <TouchableOpacity
        onPress={handleLongPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="削除"
      >
        <Ionicons name="trash-outline" size={18} color={colors.textGray} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ============================================================
// サブコンポーネント: 新規セッション追加モーダル
// ============================================================

interface AddSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (session: PracticeSession) => void;
}

/**
 * 新規練習セッション追加モーダル
 */
function AddSessionModal({ visible, onClose, onSave }: AddSessionModalProps) {
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = useCallback(() => {
    const minutes = parseInt(durationMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("エラー", "練習時間を入力してください（分単位）");
      return;
    }
    onSave({
      id: uuidv4(),
      date: new Date().toISOString(),
      duration: minutes * 60,
      notes: notes.trim() || undefined,
    });
    setDurationMinutes("");
    setNotes("");
    onClose();
  }, [durationMinutes, notes, onSave, onClose]);

  const handleClose = useCallback(() => {
    setDurationMinutes("");
    setNotes("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalSheet, { backgroundColor: colors.bgLightDark }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textWhite }]}>
              練習を記録
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Ionicons name="close" size={24} color={colors.textGray} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textGray }]}>
            練習時間（分）
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: colors.bgGray,
                color: colors.textWhite,
              },
            ]}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="30"
            placeholderTextColor={colors.textGray}
            keyboardType="numeric"
            accessibilityLabel="練習時間入力"
          />

          <Text style={[styles.inputLabel, { color: colors.textGray }]}>
            メモ（任意）
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              styles.modalTextarea,
              {
                backgroundColor: colors.bgGray,
                color: colors.textWhite,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="今日の練習について..."
            placeholderTextColor={colors.textGray}
            multiline
            numberOfLines={3}
            accessibilityLabel="メモ入力"
          />

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Text style={[styles.saveButtonText, { color: colors.textWhite }]}>
              記録する
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// メイン画面コンポーネント
// ============================================================

/**
 * 履歴画面コンポーネント
 */
export function HistoryScreen() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [stats, setStats] = useState<PracticeStats>({
    weeklyDuration: 0,
    streakDays: 0,
    totalDuration: 0,
    totalSessions: 0,
    weeklyData: Array(7).fill(0),
  });
  const [showAddModal, setShowAddModal] = useState(false);

  /**
   * セッション一覧を読み込んで統計を再計算する
   */
  const loadSessions = useCallback(async () => {
    const data = await getPracticeSessions();
    setSessions(data);
    setStats(calcStats(data));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   * セッションを削除する
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deletePracticeSession(id);
      await loadSessions();
    },
    [loadSessions]
  );

  /**
   * 新規セッションを保存する
   */
  const handleSaveSession = useCallback(
    async (session: PracticeSession) => {
      await savePracticeSession(session);
      await loadSessions();
    },
    [loadSessions]
  );

  /**
   * 練習記録をシェアする
   */
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgDark }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 統計カード（2x2グリッド） */}
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

        {/* 週次バーチャート */}
        <WeekBarChart weeklyData={stats.weeklyData} />

        {/* シェアボタン */}
        <TouchableOpacity
          onPress={handleShare}
          style={[
            styles.shareButton,
            {
              backgroundColor: colors.bgLightDark,
              borderColor: colors.secondary,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="練習記録をシェア"
        >
          <Ionicons
            name="share-social-outline"
            size={18}
            color={colors.secondary}
          />
          <Text style={[styles.shareButtonText, { color: colors.secondary }]}>
            練習記録をシェア
          </Text>
        </TouchableOpacity>

        {/* セッション一覧 */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textGray }]}>
            練習記録 ({sessions.length})
          </Text>
          {sessions.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.bgLightDark },
              ]}
            >
              <Ionicons
                name="musical-notes-outline"
                size={40}
                color={colors.textGray}
              />
              <Text style={[styles.emptyText, { color: colors.textGray }]}>
                練習記録がありません
              </Text>
              <Text
                style={[styles.emptySubText, { color: colors.textGray + "AA" }]}
              >
                右下のボタンから記録を追加してください
              </Text>
            </View>
          ) : (
            sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onDelete={handleDelete}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FABボタン（新規追加） */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="練習を記録する"
      >
        <Ionicons name="add" size={28} color={colors.textWhite} />
      </TouchableOpacity>

      {/* 新規記録追加モーダル */}
      <AddSessionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveSession}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // 統計グリッド
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "47.5%",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  // バーチャート
  chartContainer: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 100,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    gap: 4,
  },
  chartBarValue: {
    fontSize: 9,
    height: 12,
  },
  chartBarBg: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF11",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 4,
  },
  chartBarLabel: {
    fontSize: 11,
  },
  chartUnit: {
    fontSize: 10,
    textAlign: "right",
  },
  // シェアボタン
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // セクション
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // セッション行
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  sessionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  sessionNotes: {
    fontSize: 12,
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  // 空状態
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 40,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 13,
    textAlign: "center",
  },
  // FAB
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
  },
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalTextarea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
