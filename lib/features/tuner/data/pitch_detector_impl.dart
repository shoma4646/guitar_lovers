import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_audio_capture/flutter_audio_capture.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:pitch_detector_dart/pitch_detector.dart';
import '../domain/pitch_data.dart';
import '../domain/services/pitch_detector_service.dart';

/// ピッチ検出サービスの実装
class PitchDetectorImpl implements PitchDetectorService {
  final FlutterAudioCapture _audioCapture = FlutterAudioCapture();
  final PitchDetector _pitchDetector;

  final StreamController<PitchData> _pitchController =
      StreamController<PitchData>.broadcast();

  bool _isDetecting = false;

  /// サンプリングレート(Hz)
  static const int sampleRate = 44100;

  /// バッファサイズ
  static const int bufferSize = 4096;

  /// ギター音として認識する最小確率閾値
  /// 低すぎると雑音を拾い、高すぎると弱い音を検出できない
  static const double _minProbabilityThreshold = 0.22;

  /// スムージング用の過去の周波数データ（移動平均フィルタ）
  final List<double> _frequencyHistory = [];
  static const int _historySize = 3;

  PitchDetectorImpl()
      : _pitchDetector = PitchDetector(
          audioSampleRate: sampleRate.toDouble(),
          bufferSize: bufferSize,
        );

  @override
  Future<void> start() async {
    if (_isDetecting) return;

    // マイク権限のリクエスト
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      throw Exception('マイク権限が拒否されました');
    }

    try {
      // FlutterAudioCaptureの初期化
      await _audioCapture.init();

      // オーディオキャプチャの開始
      await _audioCapture.start(
        _onAudioData,
        _onError,
        sampleRate: sampleRate,
      );

      _isDetecting = true;
    } catch (e) {
      throw Exception('オーディオキャプチャの開始に失敗しました: $e');
    }
  }

  @override
  Future<void> stop() async {
    if (!_isDetecting) return;

    try {
      await _audioCapture.stop();
      _isDetecting = false;
      _frequencyHistory.clear();
      _pitchController.add(PitchData.empty);
    } catch (e) {
      throw Exception('オーディオキャプチャの停止に失敗しました: $e');
    }
  }

  /// 周波数のスムージング処理（移動平均フィルタ）
  double _smoothFrequency(double frequency) {
    if (frequency <= 0) {
      _frequencyHistory.clear();
      return 0;
    }

    _frequencyHistory.add(frequency);
    if (_frequencyHistory.length > _historySize) {
      _frequencyHistory.removeAt(0);
    }

    final sum = _frequencyHistory.fold<double>(0, (a, b) => a + b);
    return sum / _frequencyHistory.length;
  }

  /// オーディオデータを受信したときのコールバック
  void _onAudioData(dynamic audioData) async {
    if (!_isDetecting) return;

    try {
      List<double>? doubleBuffer;

      // audioDataの型に応じて変換
      if (audioData is List<int> && audioData.isNotEmpty) {
        doubleBuffer = audioData.map((e) => e.toDouble()).toList();
      } else if (audioData is List<double> && audioData.length >= bufferSize) {
        doubleBuffer = audioData;
      } else {
        return; // 無効なデータ形式の場合は早期リターン
      }

      // ピッチ検出を実行
      final result = await _pitchDetector.getPitchFromFloatBuffer(doubleBuffer);

      // ギター専用：確率閾値を調整してバランスを取る
      final isPitched =
          result.pitched && result.probability > _minProbabilityThreshold;

      // 周波数のスムージングで音の変化を滑らかに
      final smoothedFrequency =
          isPitched ? _smoothFrequency(result.pitch) : 0.0;

      final pitchData = PitchData(
        frequency: smoothedFrequency,
        probability: result.probability,
        isPitched: isPitched && smoothedFrequency > 0,
      );

      _pitchController.add(pitchData);
    } catch (e) {
      // エラーが発生しても検出を続行
      _pitchController.add(PitchData.empty);
    }
  }

  /// エラーが発生したときのコールバック
  void _onError(Object error) {
    // エラーをログ出力（デバッグビルドのみ）
    if (kDebugMode) {
      print('PitchDetector Error: $error');
    }
    // エラーの代わりに空のデータを送信
    _pitchController.add(PitchData.empty);
  }

  @override
  Stream<PitchData> get pitchStream => _pitchController.stream;

  @override
  bool get isDetecting => _isDetecting;

  @override
  void dispose() {
    // disposeは同期メソッドなので、asyncメソッドをawaitできない
    // そのため、リソースを直接クリーンアップする
    if (_isDetecting) {
      _audioCapture.stop();
      _isDetecting = false;
      _frequencyHistory.clear();
    }
    _pitchController.close();
  }
}
