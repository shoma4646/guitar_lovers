import 'dart:math';

/// ピッチ検出結果を表すデータモデル
class PitchData {
  /// 検出された周波数(Hz)
  final double frequency;

  /// 検出確度(0.0 ~ 1.0)
  final double probability;

  /// ピッチが検出されたかどうか
  final bool isPitched;

  const PitchData({
    required this.frequency,
    required this.probability,
    required this.isPitched,
  });

  /// ギターの周波数範囲内かチェック（E2 ～ E5: 82Hz～660Hz）
  bool get isGuitarRange {
    return frequency >= 70 && frequency <= 700;
  }

  /// 周波数から音名を取得
  String get noteName {
    if (!isPitched || frequency <= 0 || !isGuitarRange) return '';

    final noteNames = [
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
    final midiNumber = 69 + 12 * log(frequency / 440) / ln2;
    final noteIndex = (midiNumber.round() % 12).toInt();

    return noteNames[noteIndex];
  }

  /// 周波数からオクターブを取得
  int get octave {
    if (!isPitched || frequency <= 0) return 0;

    final midiNumber = 69 + 12 * log(frequency / 440) / ln2;
    return ((midiNumber / 12).floor() - 1).toInt();
  }

  /// 最も近い音名の基準周波数を取得
  double get targetFrequency {
    if (!isPitched || frequency <= 0) return 0.0;

    final midiNumber = 69 + 12 * log(frequency / 440) / ln2;
    final targetMidi = midiNumber.round();

    return (440 * pow(2, (targetMidi - 69) / 12)).toDouble();
  }

  /// セント単位のずれを計算(-50 ~ +50)
  /// プラスは高い、マイナスは低い
  double get cents {
    if (!isPitched || frequency <= 0) return 0;

    final target = targetFrequency;
    if (target == 0) return 0;

    return 1200 * log(frequency / target) / ln2;
  }

  /// チューニングが完了しているか(±15セント以内)
  bool get isInTune {
    return isPitched && cents.abs() < 15;
  }

  /// ギターの弦を判別（1～6、0は判別不能）
  int get guitarString {
    if (!isPitched || !isGuitarRange) return 0;

    // 標準チューニングの各弦の周波数
    const guitarStrings = {
      6: 82.41, // E2
      5: 110.0, // A2
      4: 146.83, // D3
      3: 196.0, // G3
      2: 246.94, // B3
      1: 329.63, // E4
    };

    // 最も近い弦を探す（判定範囲を狭めて精度向上）
    int closestString = 0;
    double minDiff = double.infinity;

    guitarStrings.forEach((stringNum, freq) {
      final diff = (frequency - freq).abs();
      if (diff < minDiff && diff < 30) {
        // 30Hz以内（約±4半音）
        minDiff = diff;
        closestString = stringNum;
      }
    });

    return closestString;
  }

  /// 弦の名前を取得（例：「6弦 (E)」）
  String get guitarStringName {
    final stringNum = guitarString;
    if (stringNum == 0) return '';

    const stringNames = {
      6: 'E',
      5: 'A',
      4: 'D',
      3: 'G',
      2: 'B',
      1: 'E',
    };

    return '$stringNum弦 (${stringNames[stringNum]})';
  }

  @override
  String toString() {
    return 'PitchData(frequency: $frequency Hz, note: $noteName$octave, cents: ${cents.toStringAsFixed(1)}, probability: ${probability.toStringAsFixed(2)})';
  }

  PitchData copyWith({
    double? frequency,
    double? probability,
    bool? isPitched,
  }) {
    return PitchData(
      frequency: frequency ?? this.frequency,
      probability: probability ?? this.probability,
      isPitched: isPitched ?? this.isPitched,
    );
  }

  /// 空のピッチデータ(検出なし)
  static const empty = PitchData(
    frequency: 0,
    probability: 0,
    isPitched: false,
  );
}
