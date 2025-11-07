import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_state.dart';

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
    state = state.copyWith(isPlaying: !state.isPlaying);
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
