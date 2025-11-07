import 'dart:math';

/// 音高検出サービス
class PitchDetectorService {
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

    // A4 = 440Hzを基準
    const double a4 = 440.0;
    const int a4Index = 57; // A4はMIDIノート番号57

    // 周波数からMIDIノート番号を計算
    final double midiNote = 12 * log(frequency / a4) / log(2) + a4Index;
    final int nearestMidiNote = midiNote.round();

    // セント(1半音の100分の1)を計算
    final double cents = (midiNote - nearestMidiNote) * 100;

    // 音名とオクターブを取得
    final int noteIndex = nearestMidiNote % 12;
    final int octave = (nearestMidiNote / 12).floor() - 1;
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
    final int octave = int.tryParse(noteName.substring(noteName.length - 1)) ?? 4;

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

    // MIDIノート番号を計算
    const int a4MidiNote = 57;
    const double a4Frequency = 440.0;
    final int midiNote = (octave + 1) * 12 + noteIndex;

    // 周波数を計算
    final double frequency = a4Frequency * pow(2, (midiNote - a4MidiNote) / 12);
    return frequency;
  }
}
