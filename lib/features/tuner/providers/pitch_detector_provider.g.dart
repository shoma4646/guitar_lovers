// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pitch_detector_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$pitchDetectorServiceHash() =>
    r'177bf561a2c0f03985d2e52f29b7f174f6c6d174';

/// Presentation層のプロバイダー（Riverpod Generator使用）
///
/// 注意：このファイルはData層（pitch_detector_impl.dart）に依存していますが、
/// Riverpod Generatorパターンでは実用性とメンテナンス性を優先し、
/// 厳密なClean Architectureの依存関係ルールよりもシンプルさを重視します。
///
/// テスト時は`overrideWith`でモック実装に簡単に差し替え可能です。
/// ピッチ検出サービスのプロバイダー
///
/// Copied from [pitchDetectorService].
@ProviderFor(pitchDetectorService)
final pitchDetectorServiceProvider =
    AutoDisposeProvider<PitchDetectorService>.internal(
  pitchDetectorService,
  name: r'pitchDetectorServiceProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$pitchDetectorServiceHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PitchDetectorServiceRef = AutoDisposeProviderRef<PitchDetectorService>;
String _$pitchDataStreamHash() => r'0ca6532e9723c1fd569fbf4db33dde87bb624d43';

/// ピッチデータのストリームプロバイダー
///
/// Copied from [pitchDataStream].
@ProviderFor(pitchDataStream)
final pitchDataStreamProvider = AutoDisposeStreamProvider<PitchData>.internal(
  pitchDataStream,
  name: r'pitchDataStreamProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$pitchDataStreamHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PitchDataStreamRef = AutoDisposeStreamProviderRef<PitchData>;
String _$isDetectingHash() => r'7823c15ad42b3588913c1cc915d087293b3366fb';

/// 検出中かどうかの状態プロバイダー
///
/// Copied from [IsDetecting].
@ProviderFor(IsDetecting)
final isDetectingProvider =
    AutoDisposeNotifierProvider<IsDetecting, bool>.internal(
  IsDetecting.new,
  name: r'isDetectingProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$isDetectingHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$IsDetecting = AutoDisposeNotifier<bool>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
