import '../models/pitch_data.dart';

/// ピッチ検出サービスのインターフェース
abstract class PitchDetectorService {
  /// ピッチ検出を開始
  Future<void> start();

  /// ピッチ検出を停止
  Future<void> stop();

  /// ピッチデータのストリーム
  Stream<PitchData> get pitchStream;

  /// 現在検出中かどうか
  bool get isDetecting;

  /// リソースの解放
  void dispose();
}
