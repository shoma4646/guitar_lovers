import 'package:flutter_test/flutter_test.dart';
import 'package:guitar_lovers_flutter/features/tuner/domain/pitch_data.dart';

void main() {
  group('PitchData Tests', () {
    test('Standard A4 (440Hz) should be A note', () {
      const pitch = PitchData(
        frequency: 440.0,
        probability: 1.0,
        isPitched: true,
      );

      expect(pitch.noteName, 'A');
      expect(pitch.octave, 4);
      expect(pitch.cents, closeTo(0, 0.1));
      expect(pitch.isInTune, true);
    });

    test('Standard E2 (82.41Hz) should be 6th string', () {
      const pitch = PitchData(
        frequency: 82.41,
        probability: 1.0,
        isPitched: true,
      );

      expect(pitch.noteName, 'E');
      expect(pitch.octave, 2);
      expect(pitch.guitarString, 6);
      expect(pitch.guitarStringName, '6弦 (E)');
      expect(pitch.cents, closeTo(0, 0.1));
    });

    test('Slightly sharp A4 (445Hz) should have positive cents', () {
      const pitch = PitchData(
        frequency: 445.0,
        probability: 1.0,
        isPitched: true,
      );

      expect(pitch.noteName, 'A');
      expect(pitch.cents, greaterThan(0));
      expect(pitch.isInTune, false); // Assuming threshold is < 15 cents
    });

    test('Slightly flat A4 (435Hz) should have negative cents', () {
      const pitch = PitchData(
        frequency: 435.0,
        probability: 1.0,
        isPitched: true,
      );

      expect(pitch.noteName, 'A');
      expect(pitch.cents, lessThan(0));
    });

    test('Non-guitar range frequency should return empty string', () {
      const pitch = PitchData(
        frequency: 20.0, // Too low
        probability: 1.0,
        isPitched: true,
      );

      expect(pitch.guitarString, 0);
      expect(pitch.noteName, '');
    });

    test('Empty pitch data should return default values', () {
      const pitch = PitchData.empty;

      expect(pitch.frequency, 0);
      expect(pitch.noteName, '');
      expect(pitch.cents, 0);
    });
  });
}
