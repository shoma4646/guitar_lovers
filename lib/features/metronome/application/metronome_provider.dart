import 'dart:async';
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
  final int currentBeat;

  const MetronomeState({
    this.bpm = 120,
    this.isEnabled = false,
    this.beatsPerMeasure = 4,
    this.accentEnabled = true,
    this.currentBeat = 0,
  });

  MetronomeState copyWith({
    int? bpm,
    bool? isEnabled,
    int? beatsPerMeasure,
    bool? accentEnabled,
    int? currentBeat,
  }) {
    return MetronomeState(
      bpm: bpm ?? this.bpm,
      isEnabled: isEnabled ?? this.isEnabled,
      beatsPerMeasure: beatsPerMeasure ?? this.beatsPerMeasure,
      accentEnabled: accentEnabled ?? this.accentEnabled,
      currentBeat: currentBeat ?? this.currentBeat,
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
  Timer? _timer;
  void Function()? _onBeat;

  @override
  MetronomeState build() {
    // Providerが破棄される際にタイマーをクリーンアップ
    ref.onDispose(() {
      _stopTimer();
    });
    return const MetronomeState();
  }

  /// ビートコールバックを登録（Presentation層から呼ばれる）
  void registerBeatCallback(void Function() callback) {
    _onBeat = callback;
  }

  /// BPMを設定
  void setBpm(int bpm) {
    final newBpm = bpm.clamp(MetronomeConstants.minBPM, MetronomeConstants.maxBPM);
    state = state.copyWith(bpm: newBpm);

    // 再生中の場合はタイマーを再起動
    if (state.isEnabled) {
      _startTimer();
    }
  }

  /// メトロノームのON/OFF切り替え
  void toggle() {
    if (state.isEnabled) {
      stop();
    } else {
      _start();
    }
  }

  /// メトロノームを開始
  void _start() {
    state = state.copyWith(
      isEnabled: true,
      currentBeat: 0,
    );
    _startTimer();
  }

  /// メトロノームを停止
  void stop() {
    _stopTimer();
    state = state.copyWith(
      isEnabled: false,
      currentBeat: 0,
    );
  }

  /// 拍子を設定
  void setBeatsPerMeasure(int beats) {
    state = state.copyWith(
      beatsPerMeasure: beats,
      currentBeat: 0, // 拍子変更時にビート位置をリセット
    );
  }

  /// アクセントのON/OFF切り替え
  void toggleAccent() {
    state = state.copyWith(accentEnabled: !state.accentEnabled);
  }

  /// タイマーを開始
  void _startTimer() {
    _stopTimer(); // 既存のタイマーがあれば停止
    final interval = Duration(milliseconds: (60000 / state.bpm).round());
    _timer = Timer.periodic(interval, (_) {
      _beat();
    });
  }

  /// タイマーを停止
  void _stopTimer() {
    _timer?.cancel();
    _timer = null;
  }

  /// ビート処理
  void _beat() {
    // コールバックを呼び出す（Presentation層で音声・アニメーション処理）
    _onBeat?.call();

    // ビート位置を更新
    final nextBeat = (state.currentBeat + 1) % state.beatsPerMeasure;
    state = state.copyWith(currentBeat: nextBeat);
  }
}
