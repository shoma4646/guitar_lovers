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

  PracticeState({
    this.videoId = '',
    this.isPlaying = false,
    this.playbackRate = 1.0,
    this.currentTime = 0.0,
    this.duration = 0.0,
    this.loopStart = 0.0,
    this.loopEnd = 0.0,
    this.isLooping = false,
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
    );
  }
}
