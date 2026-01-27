/// チューニングプリセット
class Tuning {
  final String name;
  final List<String> notes;
  final Map<int, double> frequencies;

  const Tuning({
    required this.name,
    required this.notes,
    required this.frequencies,
  });

  /// プリセット一覧
  static const List<Tuning> presets = [
    Tuning(
      name: 'Standard',
      notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      frequencies: {
        6: 82.41,   // E2
        5: 110.0,   // A2
        4: 146.83,  // D3
        3: 196.0,   // G3
        2: 246.94,  // B3
        1: 329.63,  // E4
      },
    ),
    Tuning(
      name: 'Half Step Down',
      notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
      frequencies: {
        6: 77.78,   // Eb2
        5: 103.83,  // Ab2
        4: 138.59,  // Db3
        3: 185.0,   // Gb3
        2: 233.08,  // Bb3
        1: 311.13,  // Eb4
      },
    ),
    Tuning(
      name: 'Drop D',
      notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      frequencies: {
        6: 73.42,   // D2
        5: 110.0,   // A2
        4: 146.83,  // D3
        3: 196.0,   // G3
        2: 246.94,  // B3
        1: 329.63,  // E4
      },
    ),
    Tuning(
      name: 'Drop C',
      notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
      frequencies: {
        6: 65.41,   // C2
        5: 98.0,    // G2
        4: 130.81,  // C3
        3: 174.61,  // F3
        2: 220.0,   // A3
        1: 293.66,  // D4
      },
    ),
    Tuning(
      name: 'Open G',
      notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
      frequencies: {
        6: 73.42,   // D2
        5: 98.0,    // G2
        4: 146.83,  // D3
        3: 196.0,   // G3
        2: 246.94,  // B3
        1: 293.66,  // D4
      },
    ),
    Tuning(
      name: 'DADGAD',
      notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
      frequencies: {
        6: 73.42,   // D2
        5: 110.0,   // A2
        4: 146.83,  // D3
        3: 196.0,   // G3
        2: 220.0,   // A3
        1: 293.66,  // D4
      },
    ),
  ];

  /// 名前からチューニングを取得
  static Tuning getByName(String name) {
    return presets.firstWhere(
      (t) => t.name == name,
      orElse: () => presets.first,
    );
  }

  /// 弦番号から音名を取得（1-6）
  String getNoteForString(int stringNum) {
    if (stringNum < 1 || stringNum > 6) return '';
    // notes配列は[6弦, 5弦, 4弦, 3弦, 2弦, 1弦]の順
    return notes[6 - stringNum];
  }

  /// 弦番号から周波数を取得
  double getFrequencyForString(int stringNum) {
    return frequencies[stringNum] ?? 0.0;
  }
}

/// チューナーの状態
class TunerState {
  final bool isListening;
  final String currentNote;
  final double cents;
  final String selectedTuning;

  TunerState({
    this.isListening = false,
    this.currentNote = '',
    this.cents = 0.0,
    this.selectedTuning = 'Standard',
  });

  TunerState copyWith({
    bool? isListening,
    String? currentNote,
    double? cents,
    String? selectedTuning,
  }) {
    return TunerState(
      isListening: isListening ?? this.isListening,
      currentNote: currentNote ?? this.currentNote,
      cents: cents ?? this.cents,
      selectedTuning: selectedTuning ?? this.selectedTuning,
    );
  }
}
