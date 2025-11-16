/// チューニングプリセット
class Tuning {
  final String name;
  final List<String> notes;

  const Tuning({
    required this.name,
    required this.notes,
  });

  static const List<Tuning> presets = [
    Tuning(
      name: 'Standard',
      notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    ),
    Tuning(
      name: 'Half Step Down',
      notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
    ),
    Tuning(
      name: 'Drop D',
      notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    ),
  ];
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
