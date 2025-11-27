// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_video_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$practiceVideoRepositoryHash() =>
    r'd7c4bcf63d238a55b4f66d2344cb29e254260e64';

/// 練習動画リポジトリのプロバイダー
///
/// Copied from [practiceVideoRepository].
@ProviderFor(practiceVideoRepository)
final practiceVideoRepositoryProvider =
    AutoDisposeFutureProvider<PracticeVideoRepository>.internal(
  practiceVideoRepository,
  name: r'practiceVideoRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$practiceVideoRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PracticeVideoRepositoryRef
    = AutoDisposeFutureProviderRef<PracticeVideoRepository>;
String _$presetVideosHash() => r'542b4daede090384188a1cf2e85a4cfed9e6fc81';

/// プリセット動画のプロバイダー
///
/// Copied from [presetVideos].
@ProviderFor(presetVideos)
final presetVideosProvider =
    AutoDisposeFutureProvider<List<PracticeVideo>>.internal(
  presetVideos,
  name: r'presetVideosProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$presetVideosHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PresetVideosRef = AutoDisposeFutureProviderRef<List<PracticeVideo>>;
String _$videosByCategoryHash() => r'fc546b1a62af0cc6ed748af2fd1d0d9aa94b703a';

/// カテゴリ別動画のプロバイダー
///
/// Copied from [videosByCategory].
@ProviderFor(videosByCategory)
final videosByCategoryProvider = AutoDisposeFutureProvider<
    Map<PracticeCategory, List<PracticeVideo>>>.internal(
  videosByCategory,
  name: r'videosByCategoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$videosByCategoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef VideosByCategoryRef
    = AutoDisposeFutureProviderRef<Map<PracticeCategory, List<PracticeVideo>>>;
String _$favoriteVideosHash() => r'8d3daaca2b8821d948a71d5163a8ffbe2dff860e';

/// お気に入り動画のプロバイダー
///
/// Copied from [FavoriteVideos].
@ProviderFor(FavoriteVideos)
final favoriteVideosProvider = AutoDisposeAsyncNotifierProvider<FavoriteVideos,
    List<PracticeVideo>>.internal(
  FavoriteVideos.new,
  name: r'favoriteVideosProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$favoriteVideosHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$FavoriteVideos = AutoDisposeAsyncNotifier<List<PracticeVideo>>;
String _$recentVideosHash() => r'bc256bc9f86ad58d00214ea1a0a545cb64defd1b';

/// 最近視聴した動画のプロバイダー
///
/// Copied from [RecentVideos].
@ProviderFor(RecentVideos)
final recentVideosProvider = AutoDisposeAsyncNotifierProvider<RecentVideos,
    List<PracticeVideo>>.internal(
  RecentVideos.new,
  name: r'recentVideosProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$recentVideosHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$RecentVideos = AutoDisposeAsyncNotifier<List<PracticeVideo>>;
String _$videoBookmarksHash() => r'91046205cce47934740d5133db3d6ea9369b065b';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

abstract class _$VideoBookmarks
    extends BuildlessAutoDisposeAsyncNotifier<List<VideoBookmark>> {
  late final String videoId;

  FutureOr<List<VideoBookmark>> build(
    String videoId,
  );
}

/// ブックマークのプロバイダー
///
/// Copied from [VideoBookmarks].
@ProviderFor(VideoBookmarks)
const videoBookmarksProvider = VideoBookmarksFamily();

/// ブックマークのプロバイダー
///
/// Copied from [VideoBookmarks].
class VideoBookmarksFamily extends Family<AsyncValue<List<VideoBookmark>>> {
  /// ブックマークのプロバイダー
  ///
  /// Copied from [VideoBookmarks].
  const VideoBookmarksFamily();

  /// ブックマークのプロバイダー
  ///
  /// Copied from [VideoBookmarks].
  VideoBookmarksProvider call(
    String videoId,
  ) {
    return VideoBookmarksProvider(
      videoId,
    );
  }

  @override
  VideoBookmarksProvider getProviderOverride(
    covariant VideoBookmarksProvider provider,
  ) {
    return call(
      provider.videoId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'videoBookmarksProvider';
}

/// ブックマークのプロバイダー
///
/// Copied from [VideoBookmarks].
class VideoBookmarksProvider extends AutoDisposeAsyncNotifierProviderImpl<
    VideoBookmarks, List<VideoBookmark>> {
  /// ブックマークのプロバイダー
  ///
  /// Copied from [VideoBookmarks].
  VideoBookmarksProvider(
    String videoId,
  ) : this._internal(
          () => VideoBookmarks()..videoId = videoId,
          from: videoBookmarksProvider,
          name: r'videoBookmarksProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$videoBookmarksHash,
          dependencies: VideoBookmarksFamily._dependencies,
          allTransitiveDependencies:
              VideoBookmarksFamily._allTransitiveDependencies,
          videoId: videoId,
        );

  VideoBookmarksProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.videoId,
  }) : super.internal();

  final String videoId;

  @override
  FutureOr<List<VideoBookmark>> runNotifierBuild(
    covariant VideoBookmarks notifier,
  ) {
    return notifier.build(
      videoId,
    );
  }

  @override
  Override overrideWith(VideoBookmarks Function() create) {
    return ProviderOverride(
      origin: this,
      override: VideoBookmarksProvider._internal(
        () => create()..videoId = videoId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        videoId: videoId,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<VideoBookmarks, List<VideoBookmark>>
      createElement() {
    return _VideoBookmarksProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is VideoBookmarksProvider && other.videoId == videoId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, videoId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin VideoBookmarksRef
    on AutoDisposeAsyncNotifierProviderRef<List<VideoBookmark>> {
  /// The parameter `videoId` of this provider.
  String get videoId;
}

class _VideoBookmarksProviderElement
    extends AutoDisposeAsyncNotifierProviderElement<VideoBookmarks,
        List<VideoBookmark>> with VideoBookmarksRef {
  _VideoBookmarksProviderElement(super.provider);

  @override
  String get videoId => (origin as VideoBookmarksProvider).videoId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
