import 'package:flutter_test/flutter_test.dart';
import 'package:guitar_lovers_flutter/features/tuner/domain/pitch_data.dart';

void main() {
  group('PitchData String Detection', () {
    test('Correctly identifies E2 string (82.41 Hz)', () {
      const pitch =
          PitchData(frequency: 82.41, probability: 1.0, isPitched: true);
      expect(pitch.guitarString, 6);
      expect(pitch.noteName, 'E');
    });

    test('Correctly identifies A2 string (110.0 Hz)', () {
      const pitch =
          PitchData(frequency: 110.0, probability: 1.0, isPitched: true);
      expect(pitch.guitarString, 5);
      expect(pitch.noteName, 'A');
    });

    test('Ambiguous frequency between E2 and A2 (96 Hz)', () {
      // 96Hz is roughly halfway between 82.41 and 110.0
      // 96 - 82.41 = 13.59
      // 110 - 96 = 14.0
      // Should be closer to E2 (6 string)
      const pitch =
          PitchData(frequency: 96.0, probability: 1.0, isPitched: true);
      expect(pitch.guitarString, 6);
    });

    test('Ambiguous frequency closer to A2 (97 Hz)', () {
      // 97 - 82.41 = 14.59
      // 110 - 97 = 13.0
      // Should be closer to A2 (5 string)
      const pitch =
          PitchData(frequency: 97.0, probability: 1.0, isPitched: true);
      expect(pitch.guitarString, 5);
    });

    test('Out of range frequency (e.g. 5000 Hz)', () {
      const pitch =
          PitchData(frequency: 5000.0, probability: 1.0, isPitched: true);
      expect(pitch.guitarString, 0);
    });
  });
}
