import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../data/pitch_detector_impl.dart';
import '../domain/pitch_data.dart';
import '../domain/services/pitch_detector_service.dart';

part 'pitch_detector_provider.g.dart';

/// Presentation層のプロバイダー（Riverpod Generator使用）
///
/// 注意：このファイルはData層（pitch_detector_impl.dart）に依存していますが、
/// Riverpod Generatorパターンでは実用性とメンテナンス性を優先し、
/// 厳密なClean Architectureの依存関係ルールよりもシンプルさを重視します。
///
/// テスト時は`overrideWith`でモック実装に簡単に差し替え可能です。

/// ピッチ検出サービスのプロバイダー
@riverpod
PitchDetectorService pitchDetectorService(Ref ref) {
  final service = PitchDetectorImpl();

  // プロバイダーが破棄されるときにリソースを解放
  ref.onDispose(() {
    service.dispose();
  });

  return service;
}

/// ピッチデータのストリームプロバイダー
@riverpod
Stream<PitchData> pitchDataStream(Ref ref) {
  final service = ref.watch(pitchDetectorServiceProvider);
  final isDetecting = ref.watch(isDetectingProvider);

  // 検出中でない場合は空のストリームを返す
  if (!isDetecting) {
    return Stream.value(PitchData.empty);
  }

  return service.pitchStream;
}

/// 検出中かどうかの状態プロバイダー
@riverpod
class IsDetecting extends _$IsDetecting {
  @override
  bool build() => false;

  void toggle(bool value) => state = value;
}
