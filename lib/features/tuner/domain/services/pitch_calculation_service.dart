import 'dart:math';

/// 音高計算サービス
class PitchCalculationService {
  /// 音名のリスト
  static const List<String> noteNames = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B'
  ];

  /// 周波数から音名とセントを計算
  static Map<String, dynamic> frequencyToNote(double frequency) {
    if (frequency <= 0) {
      return {'note': '', 'cents': 0.0, 'octave': 0};
    }

    // A4 = 440Hzを基準（MIDIノート番号69）
    const double a4 = 440.0;
    const int a4MidiNote = 69;

    // 周波数からMIDIノート番号を計算
    final double midiNote = 12 * log(frequency / a4) / log(2) + a4MidiNote;
    final int nearestMidiNote = midiNote.round();

    // セント(1半音の100分の1)を計算
    final double cents = (midiNote - nearestMidiNote) * 100;

    // 音名とオクターブを取得
    // MIDIノート0はC-1、12はC0、24はC1...
    final int noteIndex = nearestMidiNote % 12;
    final int octave = (nearestMidiNote ~/ 12) - 1;
    final String note = noteNames[noteIndex];

    return {
      'note': '$note$octave',
      'cents': cents,
      'octave': octave,
      'frequency': frequency,
    };
  }

  /// 音名から周波数を計算
  static double noteToFrequency(String noteName) {
    if (noteName.isEmpty) return 0.0;

    // 音名とオクターブを分離
    final String note = noteName.substring(0, noteName.length - 1);
    final int octave =
        int.tryParse(noteName.substring(noteName.length - 1)) ?? 4;

    // 音名からインデックスを取得
    int noteIndex = noteNames.indexOf(note);
    if (noteIndex == -1) {
      // フラット記号の処理
      if (note.endsWith('b')) {
        final String sharpNote = note.replaceAll('b', '#');
        noteIndex = noteNames.indexOf(sharpNote);
      }
    }

    if (noteIndex == -1) return 0.0;

    // MIDIノート番号を計算（C-1=0, C0=12, C1=24, ... A4=69）
    const int a4MidiNote = 69;
    const double a4Frequency = 440.0;
    final int midiNote = (octave + 1) * 12 + noteIndex;

    // 周波数を計算
    final double frequency = a4Frequency * pow(2, (midiNote - a4MidiNote) / 12);
    return frequency;
  }

  /// 周波数から最も近い弦を判定（チューニング対応）
  /// 
  /// [frequency] 検出された周波数
  /// [tuningFrequencies] 各弦の基準周波数 (Map<弦番号, 周波数>)
  /// [threshold] 判定閾値（デフォルト30Hz、約±4半音）
  /// 
  /// 戻り値: 弦番号（1-6）、判定不能な場合は0
  static int detectGuitarString(
    double frequency,
    Map<int, double> tuningFrequencies, {
    double threshold = 30.0,
  }) {
    if (frequency <= 0) return 0;

    int closestString = 0;
    double minDiff = double.infinity;

    tuningFrequencies.forEach((stringNum, targetFreq) {
      final diff = (frequency - targetFreq).abs();
      if (diff < minDiff && diff < threshold) {
        minDiff = diff;
        closestString = stringNum;
      }
    });

    return closestString;
  }

  /// 周波数と基準周波数からセント値を計算
  static double calculateCentsFromTarget(double frequency, double targetFrequency) {
    if (frequency <= 0 || targetFrequency <= 0) return 0.0;
    return 1200 * log(frequency / targetFrequency) / ln2;
  }

  /// 弦ごとの基準周波数に対するセント値を計算
  static double calculateCentsForString(
    double frequency,
    int stringNum,
    Map<int, double> tuningFrequencies,
  ) {
    final targetFreq = tuningFrequencies[stringNum];
    if (targetFreq == null || targetFreq <= 0) return 0.0;
    return calculateCentsFromTarget(frequency, targetFreq);
  }
}
