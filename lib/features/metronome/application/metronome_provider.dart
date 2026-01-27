import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'metronome_provider.g.dart';

/// メトロノームの状態
@immutable
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

/// メトロノームの定数
class MetronomeConstants {
  MetronomeConstants._();

  /// BPM範囲
  static const int minBPM = 40;
  static const int maxBPM = 240;

  /// 利用可能な拍子
  static const List<int> availableBeats = [2, 3, 4, 6];

  /// プリセットBPM
  static const List<int> presetBPMs = [60, 80, 100, 120, 140, 160];

  /// BPM変更のステップ
  static const int bpmStep = 5;
}

/// メトロノームの状態管理
@riverpod
class Metronome extends _$Metronome {
  @override
  MetronomeState build() {
    return const MetronomeState();
  }

  /// BPMを設定
  void setBpm(int bpm) {
    state = state.copyWith(
      bpm: bpm.clamp(MetronomeConstants.minBPM, MetronomeConstants.maxBPM),
    );
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
