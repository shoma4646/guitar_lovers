import 'package:flutter_test/flutter_test.dart';
import 'package:guitar_lovers_flutter/features/metronome/application/metronome_provider.dart';

void main() {
  group('MetronomeState', () {
    test('デフォルト値が正しい', () {
      const state = MetronomeState();
      expect(state.bpm, 120);
      expect(state.isEnabled, false);
      expect(state.beatsPerMeasure, 4);
      expect(state.accentEnabled, true);
    });

    test('copyWithが正しく動作する', () {
      const state = MetronomeState();
      final newState = state.copyWith(
        bpm: 100,
        isEnabled: true,
        beatsPerMeasure: 3,
        accentEnabled: false,
      );

      expect(newState.bpm, 100);
      expect(newState.isEnabled, true);
      expect(newState.beatsPerMeasure, 3);
      expect(newState.accentEnabled, false);
    });

    test('copyWithで一部のみ更新できる', () {
      const state = MetronomeState(bpm: 80);
      final newState = state.copyWith(isEnabled: true);

      expect(newState.bpm, 80); // 変更されていない
      expect(newState.isEnabled, true);
      expect(newState.beatsPerMeasure, 4); // デフォルト値
    });
  });

  group('MetronomeConstants', () {
    test('BPM範囲が正しい', () {
      expect(MetronomeConstants.minBPM, 40);
      expect(MetronomeConstants.maxBPM, 240);
    });

    test('利用可能な拍子が正しい', () {
      expect(MetronomeConstants.availableBeats, [2, 3, 4, 6]);
    });

    test('プリセットBPMが正しい', () {
      expect(MetronomeConstants.presetBPMs, [60, 80, 100, 120, 140, 160]);
    });

    test('BPMステップが正しい', () {
      expect(MetronomeConstants.bpmStep, 5);
    });
  });
}
