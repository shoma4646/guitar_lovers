import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/practice_history_repository.dart';
import '../domain/models/practice_session.dart';
import '../domain/models/practice_stats.dart';

part 'practice_history_provider.g.dart';

/// SharedPreferencesのプロバイダー
@riverpod
Future<SharedPreferences> sharedPreferences(Ref ref) async {
  return await SharedPreferences.getInstance();
}

/// 練習履歴リポジトリのプロバイダー
@riverpod
Future<PracticeHistoryRepository> practiceHistoryRepository(Ref ref) async {
  final prefs = await ref.watch(sharedPreferencesProvider.future);
  return PracticeHistoryRepository(prefs);
}

/// 練習セッションリストのプロバイダー
@riverpod
class PracticeSessions extends _$PracticeSessions {
  @override
  Future<List<PracticeSession>> build() async {
    final repository =
        await ref.watch(practiceHistoryRepositoryProvider.future);
    final sessions = await repository.getSessions();
    // 日付でソート（新しい順）
    sessions.sort((a, b) => b.dateTime.compareTo(a.dateTime));
    return sessions;
  }

  /// セッションを追加
  Future<void> addSession({
    required int durationMinutes,
    String? notes,
    String? tuning,
  }) async {
    final repository = await ref.read(practiceHistoryRepositoryProvider.future);
    final session = PracticeSession.create(
      durationMinutes: durationMinutes,
      notes: notes,
      tuning: tuning,
    );
    await repository.addSession(session);
    ref.invalidateSelf();
    ref.invalidate(practiceStatsProvider);
    ref.invalidate(weeklyDataProvider);
  }

  /// セッションを削除
  Future<void> deleteSession(String sessionId) async {
    final repository = await ref.read(practiceHistoryRepositoryProvider.future);
    await repository.deleteSession(sessionId);
    ref.invalidateSelf();
    ref.invalidate(practiceStatsProvider);
    ref.invalidate(weeklyDataProvider);
  }

  /// すべてのセッションを削除
  Future<void> clearAll() async {
    final repository = await ref.read(practiceHistoryRepositoryProvider.future);
    await repository.clearAll();
    ref.invalidateSelf();
    ref.invalidate(practiceStatsProvider);
    ref.invalidate(weeklyDataProvider);
  }
}

/// 統計情報のプロバイダー
@riverpod
Future<PracticeStats> practiceStats(Ref ref) async {
  final repository = await ref.watch(practiceHistoryRepositoryProvider.future);
  return await repository.calculateStats();
}

/// 週次データのプロバイダー
@riverpod
Future<List<int>> weeklyData(Ref ref) async {
  final repository = await ref.watch(practiceHistoryRepositoryProvider.future);
  return await repository.getWeeklyData();
}
