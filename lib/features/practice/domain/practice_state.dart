/// 練習画面の状態モデル
class PracticeState {
  final String videoId;
  final bool isPlaying;
  final double playbackRate;
  final double currentTime;
  final double duration;
  final double loopStart;
  final double loopEnd;
  final bool isLooping;

  /// 練習開始時刻
  final DateTime? practiceStartTime;

  /// 累積練習時間（秒）
  final int accumulatedPracticeSeconds;

  /// メトロノームBPM
  final int metronomeBpm;

  /// メトロノーム有効フラグ
  final bool isMetronomeEnabled;

  PracticeState({
    this.videoId = '',
    this.isPlaying = false,
    this.playbackRate = 1.0,
    this.currentTime = 0.0,
    this.duration = 0.0,
    this.loopStart = 0.0,
    this.loopEnd = 0.0,
    this.isLooping = false,
    this.practiceStartTime,
    this.accumulatedPracticeSeconds = 0,
    this.metronomeBpm = 120,
    this.isMetronomeEnabled = false,
  });

  PracticeState copyWith({
    String? videoId,
    bool? isPlaying,
    double? playbackRate,
    double? currentTime,
    double? duration,
    double? loopStart,
    double? loopEnd,
    bool? isLooping,
    DateTime? practiceStartTime,
    bool clearPracticeStartTime = false,
    int? accumulatedPracticeSeconds,
    int? metronomeBpm,
    bool? isMetronomeEnabled,
  }) {
    return PracticeState(
      videoId: videoId ?? this.videoId,
      isPlaying: isPlaying ?? this.isPlaying,
      playbackRate: playbackRate ?? this.playbackRate,
      currentTime: currentTime ?? this.currentTime,
      duration: duration ?? this.duration,
      loopStart: loopStart ?? this.loopStart,
      loopEnd: loopEnd ?? this.loopEnd,
      isLooping: isLooping ?? this.isLooping,
      practiceStartTime: clearPracticeStartTime
          ? null
          : (practiceStartTime ?? this.practiceStartTime),
      accumulatedPracticeSeconds:
          accumulatedPracticeSeconds ?? this.accumulatedPracticeSeconds,
      metronomeBpm: metronomeBpm ?? this.metronomeBpm,
      isMetronomeEnabled: isMetronomeEnabled ?? this.isMetronomeEnabled,
    );
  }

  /// 現在の練習時間（分）を取得
  int get totalPracticeMinutes {
    int totalSeconds = accumulatedPracticeSeconds;
    if (practiceStartTime != null && isPlaying) {
      totalSeconds +=
          DateTime.now().difference(practiceStartTime!).inSeconds;
    }
    return (totalSeconds / 60).floor();
  }
}
