import 'package:flutter_riverpod/flutter_riverpod.dart';

/// メトロノームの状態
class MetronomeState {
  final int bpm;
  final bool isEnabled;
  final int beatsPerMeasure;
  final bool accentEnabled;

  const MetronomeState({
    this.bpm = 120,
    this.isEnabled = false,
    this.beatsPerMeasure = 4,
    this.accentEnabled = true,
  });

  MetronomeState copyWith({
    int? bpm,
    bool? isEnabled,
    int? beatsPerMeasure,
    bool? accentEnabled,
  }) {
    return MetronomeState(
      bpm: bpm ?? this.bpm,
      isEnabled: isEnabled ?? this.isEnabled,
      beatsPerMeasure: beatsPerMeasure ?? this.beatsPerMeasure,
      accentEnabled: accentEnabled ?? this.accentEnabled,
    );
  }
}

/// メトロノームの状態管理
class MetronomeNotifier extends StateNotifier<MetronomeState> {
  MetronomeNotifier() : super(const MetronomeState());

  /// BPM範囲
  static const int minBPM = 40;
  static const int maxBPM = 240;

  /// BPMを設定
  void setBpm(int bpm) {
    state = state.copyWith(bpm: bpm.clamp(minBPM, maxBPM));
  }

  /// メトロノームのON/OFF切り替え
  void toggle() {
    state = state.copyWith(isEnabled: !state.isEnabled);
  }

  /// メトロノームを停止
  void stop() {
    state = state.copyWith(isEnabled: false);
  }

  /// 拍子を設定
  void setBeatsPerMeasure(int beats) {
    state = state.copyWith(beatsPerMeasure: beats);
  }

  /// アクセントのON/OFF切り替え
  void toggleAccent() {
    state = state.copyWith(accentEnabled: !state.accentEnabled);
  }
}

final metronomeProvider =
    StateNotifierProvider<MetronomeNotifier, MetronomeState>((ref) {
  return MetronomeNotifier();
});
