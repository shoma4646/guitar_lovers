import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../domain/practice_session.dart';
import '../domain/practice_stats.dart';

/// 練習履歴のリポジトリ（データ永続化）
class PracticeHistoryRepository {
  static const String _storageKey = 'practice_sessions';

  final SharedPreferences _prefs;

  PracticeHistoryRepository(this._prefs);

  /// すべての練習セッションを取得
  Future<List<PracticeSession>> getSessions() async {
    final jsonString = _prefs.getString(_storageKey);
    if (jsonString == null) {
      return [];
    }

    try {
      final List<dynamic> jsonList = jsonDecode(jsonString);
      return jsonList
          .map((json) => PracticeSession.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  /// セッションを追加
  Future<void> addSession(PracticeSession session) async {
    final sessions = await getSessions();
    sessions.add(session);
    await _saveSessions(sessions);
  }

  /// セッションを削除
  Future<void> deleteSession(String sessionId) async {
    final sessions = await getSessions();
    sessions.removeWhere((session) => session.id == sessionId);
    await _saveSessions(sessions);
  }

  /// すべてのセッションを削除
  Future<void> clearAll() async {
    await _prefs.remove(_storageKey);
  }

  /// セッションリストを保存
  Future<void> _saveSessions(List<PracticeSession> sessions) async {
    final jsonList = sessions.map((session) => session.toJson()).toList();
    final jsonString = jsonEncode(jsonList);
    await _prefs.setString(_storageKey, jsonString);
  }

  /// 統計情報を計算
  Future<PracticeStats> calculateStats() async {
    final sessions = await getSessions();

    if (sessions.isEmpty) {
      return PracticeStats.empty;
    }

    // 日付でソート（新しい順）
    sessions.sort((a, b) => b.dateTime.compareTo(a.dateTime));

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // 累計時間
    final totalMinutes = sessions.fold<int>(
      0,
      (sum, session) => sum + session.durationMinutes,
    );

    // 今週の開始日（月曜日）
    final weekStart = today.subtract(Duration(days: today.weekday - 1));
    final weeklyMinutes = sessions
        .where((session) => session.dateTime.isAfter(weekStart))
        .fold<int>(0, (sum, session) => sum + session.durationMinutes);

    // 今月の開始日
    final monthStart = DateTime(now.year, now.month, 1);
    final monthlyMinutes = sessions
        .where((session) => session.dateTime.isAfter(monthStart))
        .fold<int>(0, (sum, session) => sum + session.durationMinutes);

    // 連続練習日数の計算
    final streakData = _calculateStreak(sessions, today);

    // 平均練習時間
    final averageMinutes = totalMinutes / sessions.length;

    return PracticeStats(
      totalMinutes: totalMinutes,
      weeklyMinutes: weeklyMinutes,
      monthlyMinutes: monthlyMinutes,
      currentStreak: streakData['current'] ?? 0,
      longestStreak: streakData['longest'] ?? 0,
      averageMinutes: averageMinutes,
      totalSessions: sessions.length,
    );
  }

  /// 連続練習日数を計算
  Map<String, int> _calculateStreak(
    List<PracticeSession> sessions,
    DateTime today,
  ) {
    if (sessions.isEmpty) {
      return {'current': 0, 'longest': 0};
    }

    // 日付ごとにグループ化
    final dateSet = <DateTime>{};
    for (final session in sessions) {
      final date = DateTime(
        session.dateTime.year,
        session.dateTime.month,
        session.dateTime.day,
      );
      dateSet.add(date);
    }

    // 日付をソート（新しい順）
    final sortedDates = dateSet.toList()..sort((a, b) => b.compareTo(a));

    // 現在のストリーク計算
    int currentStreak = 0;
    DateTime checkDate = today;

    for (final date in sortedDates) {
      if (date.isAtSameMomentAs(checkDate) ||
          date.isAtSameMomentAs(checkDate.subtract(const Duration(days: 1)))) {
        currentStreak++;
        checkDate = date.subtract(const Duration(days: 1));
      } else {
        break;
      }
    }

    // 最長ストリーク計算
    int longestStreak = 0;
    int tempStreak = 1;

    for (int i = 0; i < sortedDates.length - 1; i++) {
      final diff = sortedDates[i].difference(sortedDates[i + 1]).inDays;
      if (diff == 1) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 1;
      }
    }

    longestStreak =
        longestStreak > currentStreak ? longestStreak : currentStreak;

    return {'current': currentStreak, 'longest': longestStreak};
  }

  /// 週次データを取得（月〜日の7日分）
  Future<List<int>> getWeeklyData() async {
    final sessions = await getSessions();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    // 月曜日を週の開始とする
    final weekStart = today.subtract(Duration(days: today.weekday - 1));

    final weeklyData = List<int>.filled(7, 0);

    for (final session in sessions) {
      final sessionDate = DateTime(
        session.dateTime.year,
        session.dateTime.month,
        session.dateTime.day,
      );

      if (sessionDate.isAfter(weekStart.subtract(const Duration(days: 1))) &&
          sessionDate.isBefore(weekStart.add(const Duration(days: 7)))) {
        final dayIndex = sessionDate.difference(weekStart).inDays;
        if (dayIndex >= 0 && dayIndex < 7) {
          weeklyData[dayIndex] += session.durationMinutes;
        }
      }
    }

    return weeklyData;
  }
}
