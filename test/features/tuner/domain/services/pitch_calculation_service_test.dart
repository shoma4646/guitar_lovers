import 'package:flutter_test/flutter_test.dart';
import 'package:guitar_lovers_flutter/features/tuner/domain/services/pitch_calculation_service.dart';
import 'package:guitar_lovers_flutter/features/tuner/domain/tuning.dart';

void main() {
  group('PitchCalculationService', () {
    group('frequencyToNote', () {
      test('A4 (440Hz) が正しく変換される', () {
        final result = PitchCalculationService.frequencyToNote(440.0);
        expect(result['note'], 'A4');
        expect((result['cents'] as double).abs(), lessThan(1));
      });

      test('C4 (約261.63Hz) が正しく変換される', () {
        final result = PitchCalculationService.frequencyToNote(261.63);
        expect(result['note'], 'C4');
        expect((result['cents'] as double).abs(), lessThan(5));
      });

      test('E2 (約82.41Hz) が正しく変換される', () {
        final result = PitchCalculationService.frequencyToNote(82.41);
        expect(result['note'], 'E2');
        expect((result['cents'] as double).abs(), lessThan(5));
      });

      test('0Hz以下は空の結果を返す', () {
        final result = PitchCalculationService.frequencyToNote(0);
        expect(result['note'], '');
        expect(result['cents'], 0.0);
      });

      test('負の周波数は空の結果を返す', () {
        final result = PitchCalculationService.frequencyToNote(-100);
        expect(result['note'], '');
      });
    });

    group('noteToFrequency', () {
      test('A4 が440Hzを返す', () {
        final freq = PitchCalculationService.noteToFrequency('A4');
        expect(freq, closeTo(440.0, 0.1));
      });

      test('E2 が約82.41Hzを返す', () {
        final freq = PitchCalculationService.noteToFrequency('E2');
        expect(freq, closeTo(82.41, 1.0));
      });

      test('空文字は0を返す', () {
        final freq = PitchCalculationService.noteToFrequency('');
        expect(freq, 0.0);
      });
    });

    group('detectGuitarString', () {
      final standardFrequencies = Tuning.getByName('Standard').frequencies;
      final dropDFrequencies = Tuning.getByName('Drop D').frequencies;

      test('Standardチューニングで6弦E2 (82.41Hz) を正しく検出', () {
        final stringNum = PitchCalculationService.detectGuitarString(
          82.41,
          standardFrequencies,
        );
        expect(stringNum, 6);
      });

      test('Standardチューニングで1弦E4 (329.63Hz) を正しく検出', () {
        final stringNum = PitchCalculationService.detectGuitarString(
          329.63,
          standardFrequencies,
        );
        expect(stringNum, 1);
      });

      test('Standardチューニングで5弦A2 (110Hz) を正しく検出', () {
        final stringNum = PitchCalculationService.detectGuitarString(
          110.0,
          standardFrequencies,
        );
        expect(stringNum, 5);
      });

      test('Drop Dチューニングで6弦D2 (73.42Hz) を正しく検出', () {
        final stringNum = PitchCalculationService.detectGuitarString(
          73.42,
          dropDFrequencies,
        );
        expect(stringNum, 6);
      });

      test('閾値を超える周波数は0を返す', () {
        final stringNum = PitchCalculationService.detectGuitarString(
          500.0, // どの弦からも離れている
          standardFrequencies,
        );
        expect(stringNum, 0);
      });

      test('0Hz以下は0を返す', () {
        final stringNum = PitchCalculationService.detectGuitarString(
          0,
          standardFrequencies,
        );
        expect(stringNum, 0);
      });

      test('カスタム閾値が動作する', () {
        // 閾値を小さくすると検出が厳しくなる
        final stringNum = PitchCalculationService.detectGuitarString(
          85.0, // E2(82.41Hz)から約3Hz離れている
          standardFrequencies,
          threshold: 2.0, // 2Hz以内のみ検出
        );
        expect(stringNum, 0); // 検出されない
      });
    });

    group('calculateCentsFromTarget', () {
      test('同じ周波数は0セントを返す', () {
        final cents = PitchCalculationService.calculateCentsFromTarget(440.0, 440.0);
        expect(cents, closeTo(0.0, 0.1));
      });

      test('1オクターブ上は1200セントを返す', () {
        final cents = PitchCalculationService.calculateCentsFromTarget(880.0, 440.0);
        expect(cents, closeTo(1200.0, 0.1));
      });

      test('1オクターブ下は-1200セントを返す', () {
        final cents = PitchCalculationService.calculateCentsFromTarget(220.0, 440.0);
        expect(cents, closeTo(-1200.0, 0.1));
      });

      test('少し高い周波数は正のセントを返す', () {
        // 445Hzは440Hzより約19.6セント高い
        final cents = PitchCalculationService.calculateCentsFromTarget(445.0, 440.0);
        expect(cents, greaterThan(0));
        expect(cents, closeTo(19.6, 1.0));
      });

      test('少し低い周波数は負のセントを返す', () {
        // 435Hzは440Hzより約-19.8セント低い
        final cents = PitchCalculationService.calculateCentsFromTarget(435.0, 440.0);
        expect(cents, lessThan(0));
        expect(cents, closeTo(-19.8, 1.0));
      });

      test('0Hzの周波数は0セントを返す', () {
        final cents = PitchCalculationService.calculateCentsFromTarget(0, 440.0);
        expect(cents, 0.0);
      });

      test('0Hzの基準周波数は0セントを返す', () {
        final cents = PitchCalculationService.calculateCentsFromTarget(440.0, 0);
        expect(cents, 0.0);
      });
    });

    group('calculateCentsForString', () {
      final standardFrequencies = Tuning.getByName('Standard').frequencies;

      test('6弦の基準周波数と同じ場合は0セントを返す', () {
        final cents = PitchCalculationService.calculateCentsForString(
          82.41, // E2
          6,
          standardFrequencies,
        );
        expect(cents.abs(), lessThan(1.0));
      });

      test('6弦より少し高い場合は正のセントを返す', () {
        final cents = PitchCalculationService.calculateCentsForString(
          85.0, // E2より少し高い
          6,
          standardFrequencies,
        );
        expect(cents, greaterThan(0));
      });

      test('存在しない弦番号は0セントを返す', () {
        final cents = PitchCalculationService.calculateCentsForString(
          440.0,
          7, // 存在しない弦
          standardFrequencies,
        );
        expect(cents, 0.0);
      });
    });
  });
}
