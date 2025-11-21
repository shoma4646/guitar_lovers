import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/practice_state.dart';

/// 練習機能の状態管理
class PracticeNotifier extends StateNotifier<PracticeState> {
  PracticeNotifier() : super(PracticeState());

  /// YouTube URLからビデオIDを抽出
  String? extractVideoId(String url) {
    final patterns = [
      RegExp(r'youtube\.com/watch\?v=([^&]+)'),
      RegExp(r'youtu\.be/([^?]+)'),
      RegExp(r'youtube\.com/embed/([^?]+)'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(url);
      if (match != null && match.groupCount >= 1) {
        return match.group(1);
      }
    }
    return null;
  }

  /// ビデオIDを設定
  void setVideoId(String url) {
    final videoId = extractVideoId(url);
    if (videoId != null) {
      state = PracticeState(videoId: videoId);
    }
  }

  /// 再生状態を切り替え
  void togglePlaying() {
    if (state.isPlaying) {
      // 再生停止時：累積時間を更新
      if (state.practiceStartTime != null) {
        final elapsed =
            DateTime.now().difference(state.practiceStartTime!).inSeconds;
        state = state.copyWith(
          isPlaying: false,
          accumulatedPracticeSeconds:
              state.accumulatedPracticeSeconds + elapsed,
          practiceStartTime: null,
        );
      } else {
        state = state.copyWith(isPlaying: false);
      }
    } else {
      // 再生開始時：開始時刻を記録
      state = state.copyWith(
        isPlaying: true,
        practiceStartTime: DateTime.now(),
      );
    }
  }

  /// 練習時間をリセット
  void resetPracticeTime() {
    state = state.copyWith(
      accumulatedPracticeSeconds: 0,
      practiceStartTime: state.isPlaying ? DateTime.now() : null,
    );
  }

  /// 練習時間を取得（分）
  int getPracticeMinutes() {
    int totalSeconds = state.accumulatedPracticeSeconds;
    if (state.practiceStartTime != null && state.isPlaying) {
      totalSeconds +=
          DateTime.now().difference(state.practiceStartTime!).inSeconds;
    }
    return (totalSeconds / 60).floor();
  }

  /// メトロノームBPMを設定
  void setMetronomeBpm(int bpm) {
    state = state.copyWith(metronomeBpm: bpm.clamp(40, 240));
  }

  /// メトロノームのON/OFF切り替え
  void toggleMetronome() {
    state = state.copyWith(isMetronomeEnabled: !state.isMetronomeEnabled);
  }

  /// 再生速度を設定
  void setPlaybackRate(double rate) {
    state = state.copyWith(playbackRate: rate);
  }

  /// 現在時刻を更新
  void updateCurrentTime(double time) {
    state = state.copyWith(currentTime: time);
  }

  /// 動画の長さを設定
  void setDuration(double duration) {
    state = state.copyWith(duration: duration);
  }

  /// ループ開始点を設定
  void setLoopStart() {
    state = state.copyWith(loopStart: state.currentTime);
  }

  /// ループ終了点を設定
  void setLoopEnd() {
    state = state.copyWith(loopEnd: state.currentTime);
  }

  /// ループのON/OFF切り替え
  void toggleLoop() {
    state = state.copyWith(isLooping: !state.isLooping);
  }

  /// ループをクリア
  void clearLoop() {
    state = state.copyWith(
      loopStart: 0.0,
      loopEnd: 0.0,
      isLooping: false,
    );
  }
}

final practiceProvider =
    StateNotifierProvider<PracticeNotifier, PracticeState>((ref) {
  return PracticeNotifier();
});
