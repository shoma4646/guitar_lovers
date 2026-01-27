import 'package:flutter_test/flutter_test.dart';
import 'package:guitar_lovers_flutter/features/tuner/domain/tuning.dart';

void main() {
  group('Tuning', () {
    test('プリセットが正しく定義されている', () {
      expect(Tuning.presets.length, greaterThanOrEqualTo(3));
      expect(Tuning.presets.map((t) => t.name), contains('Standard'));
      expect(Tuning.presets.map((t) => t.name), contains('Half Step Down'));
      expect(Tuning.presets.map((t) => t.name), contains('Drop D'));
    });

    test('Standardチューニングの周波数が正しい', () {
      final standard = Tuning.getByName('Standard');
      expect(standard.name, 'Standard');
      expect(standard.frequencies[6], closeTo(82.41, 0.1)); // E2
      expect(standard.frequencies[5], closeTo(110.0, 0.1)); // A2
      expect(standard.frequencies[4], closeTo(146.83, 0.1)); // D3
      expect(standard.frequencies[3], closeTo(196.0, 0.1)); // G3
      expect(standard.frequencies[2], closeTo(246.94, 0.1)); // B3
      expect(standard.frequencies[1], closeTo(329.63, 0.1)); // E4
    });

    test('Drop Dチューニングの6弦がD2になっている', () {
      final dropD = Tuning.getByName('Drop D');
      expect(dropD.name, 'Drop D');
      expect(dropD.frequencies[6], closeTo(73.42, 0.1)); // D2
      expect(dropD.frequencies[5], closeTo(110.0, 0.1)); // A2（Standard同様）
    });

    test('Half Step Downチューニングの周波数が正しい', () {
      final halfStepDown = Tuning.getByName('Half Step Down');
      expect(halfStepDown.name, 'Half Step Down');
      expect(halfStepDown.frequencies[6], closeTo(77.78, 0.1)); // Eb2
      expect(halfStepDown.frequencies[1], closeTo(311.13, 0.1)); // Eb4
    });

    test('getByNameで存在しない名前を指定するとStandardを返す', () {
      final tuning = Tuning.getByName('存在しないチューニング');
      expect(tuning.name, 'Standard');
    });

    test('getNoteForStringが正しい音名を返す', () {
      final standard = Tuning.getByName('Standard');
      expect(standard.getNoteForString(6), 'E2');
      expect(standard.getNoteForString(5), 'A2');
      expect(standard.getNoteForString(4), 'D3');
      expect(standard.getNoteForString(3), 'G3');
      expect(standard.getNoteForString(2), 'B3');
      expect(standard.getNoteForString(1), 'E4');
    });

    test('getNoteForStringで範囲外の弦番号を指定すると空文字を返す', () {
      final standard = Tuning.getByName('Standard');
      expect(standard.getNoteForString(0), '');
      expect(standard.getNoteForString(7), '');
      expect(standard.getNoteForString(-1), '');
    });

    test('getFrequencyForStringが正しい周波数を返す', () {
      final standard = Tuning.getByName('Standard');
      expect(standard.getFrequencyForString(6), closeTo(82.41, 0.1));
      expect(standard.getFrequencyForString(1), closeTo(329.63, 0.1));
    });

    test('getFrequencyForStringで存在しない弦番号を指定すると0を返す', () {
      final standard = Tuning.getByName('Standard');
      expect(standard.getFrequencyForString(0), 0.0);
      expect(standard.getFrequencyForString(7), 0.0);
    });
  });

  group('TunerState', () {
    test('デフォルト値が正しい', () {
      final state = TunerState();
      expect(state.isListening, false);
      expect(state.currentNote, '');
      expect(state.cents, 0.0);
      expect(state.selectedTuning, 'Standard');
    });

    test('copyWithが正しく動作する', () {
      final state = TunerState();
      final newState = state.copyWith(
        isListening: true,
        currentNote: 'E',
        cents: 5.0,
        selectedTuning: 'Drop D',
      );

      expect(newState.isListening, true);
      expect(newState.currentNote, 'E');
      expect(newState.cents, 5.0);
      expect(newState.selectedTuning, 'Drop D');
    });

    test('copyWithで一部のみ更新できる', () {
      final state = TunerState(selectedTuning: 'Drop D');
      final newState = state.copyWith(isListening: true);

      expect(newState.isListening, true);
      expect(newState.selectedTuning, 'Drop D'); // 変更されていない
    });
  });
}
