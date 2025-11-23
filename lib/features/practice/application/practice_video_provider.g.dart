// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_video_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$practiceVideoRepositoryHash() =>
    r'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';

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
String _$presetVideosHash() => r'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1';

/// プリセット動画のプロバイダー
///
/// Copied from [presetVideos].
@ProviderFor(presetVideos)
final presetVideosProvider = AutoDisposeProvider<List<PracticeVideo>>.internal(
  presetVideos,
  name: r'presetVideosProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$presetVideosHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PresetVideosRef = AutoDisposeProviderRef<List<PracticeVideo>>;
String _$videosByCategoryHash() => r'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2';

/// カテゴリ別動画のプロバイダー
///
/// Copied from [videosByCategory].
@ProviderFor(videosByCategory)
final videosByCategoryProvider =
    AutoDisposeProvider<Map<PracticeCategory, List<PracticeVideo>>>.internal(
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
    = AutoDisposeProviderRef<Map<PracticeCategory, List<PracticeVideo>>>;
String _$favoriteVideosHash() => r'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3';

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
String _$recentVideosHash() => r'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4';

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
String _$videoBookmarksHash() => r'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5';

/// ブックマークのプロバイダー
///
/// Copied from [VideoBookmarks].
@ProviderFor(VideoBookmarks)
final videoBookmarksProvider = AutoDisposeAsyncNotifierProviderFamily<
    VideoBookmarks, List<VideoBookmark>, String>.internal(
  VideoBookmarks.new,
  name: r'videoBookmarksProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$videoBookmarksHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$VideoBookmarks = AutoDisposeFamilyAsyncNotifier<List<VideoBookmark>, String>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
