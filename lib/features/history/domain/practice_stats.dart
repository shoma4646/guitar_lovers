/// 練習統計情報のデータモデル
class PracticeStats {
  /// 累計練習時間（分）
  final int totalMinutes;

  /// 今週の練習時間（分）
  final int weeklyMinutes;

  /// 今月の練習時間（分）
  final int monthlyMinutes;

  /// 連続練習日数
  final int currentStreak;

  /// 最長連続練習日数
  final int longestStreak;

  /// 平均練習時間（分）
  final double averageMinutes;

  /// 総練習回数
  final int totalSessions;

  const PracticeStats({
    required this.totalMinutes,
    required this.weeklyMinutes,
    required this.monthlyMinutes,
    required this.currentStreak,
    required this.longestStreak,
    required this.averageMinutes,
    required this.totalSessions,
  });

  /// 累計時間の文字列表示（例：「2時間30分」）
  String get totalTimeFormatted {
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (hours > 0) {
      return '$hours時間$minutes分';
    } else {
      return '$minutes分';
    }
  }

  /// 今週の時間の文字列表示
  String get weeklyTimeFormatted {
    final hours = weeklyMinutes ~/ 60;
    final minutes = weeklyMinutes % 60;
    if (hours > 0) {
      return '$hours時間$minutes分';
    } else {
      return '$minutes分';
    }
  }

  /// 空の統計情報
  static const empty = PracticeStats(
    totalMinutes: 0,
    weeklyMinutes: 0,
    monthlyMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageMinutes: 0,
    totalSessions: 0,
  );
}
