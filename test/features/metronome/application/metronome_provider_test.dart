import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

  group('Metronome Notifier', () {
    test('setBpmでBPM範囲外の値をクランプする', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(metronomeProvider.notifier);

      notifier.setBpm(300); // maxBPM(240)を超える
      expect(container.read(metronomeProvider).bpm, 240);

      notifier.setBpm(10); // minBPM(40)未満
      expect(container.read(metronomeProvider).bpm, 40);
    });

    test('toggleで再生状態が切り替わる', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(metronomeProvider.notifier);

      expect(container.read(metronomeProvider).isEnabled, false);
      notifier.toggle();
      expect(container.read(metronomeProvider).isEnabled, true);
      notifier.toggle();
      expect(container.read(metronomeProvider).isEnabled, false);
    });

    test('stopで再生が停止する', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(metronomeProvider.notifier);

      notifier.toggle(); // 再生開始
      expect(container.read(metronomeProvider).isEnabled, true);
      notifier.stop();
      expect(container.read(metronomeProvider).isEnabled, false);
    });

    test('setBeatsPerMeasureで拍子が変更される', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(metronomeProvider.notifier);

      notifier.setBeatsPerMeasure(3);
      expect(container.read(metronomeProvider).beatsPerMeasure, 3);
    });

    test('setBeatsPerMeasureでビート位置がリセットされる', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(metronomeProvider.notifier);

      // 初期状態を変更してビート位置を進める（手動で状態を更新）
      container.read(metronomeProvider.notifier);
      // 拍子を変更
      notifier.setBeatsPerMeasure(3);
      // ビート位置が0にリセットされる
      expect(container.read(metronomeProvider).currentBeat, 0);
    });

    test('toggleAccentでアクセント設定が切り替わる', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(metronomeProvider.notifier);

      final initial = container.read(metronomeProvider).accentEnabled;
      notifier.toggleAccent();
      expect(container.read(metronomeProvider).accentEnabled, !initial);
    });
  });
}
