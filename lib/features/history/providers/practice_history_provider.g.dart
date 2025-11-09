// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_history_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$sharedPreferencesHash() => r'dc403fbb1d968c7d5ab4ae1721a29ffe173701c7';

/// SharedPreferencesのプロバイダー
///
/// Copied from [sharedPreferences].
@ProviderFor(sharedPreferences)
final sharedPreferencesProvider =
    AutoDisposeFutureProvider<SharedPreferences>.internal(
  sharedPreferences,
  name: r'sharedPreferencesProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$sharedPreferencesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef SharedPreferencesRef = AutoDisposeFutureProviderRef<SharedPreferences>;
String _$practiceHistoryRepositoryHash() =>
    r'06aabc4e82d74646309a91022491b99923b14944';

/// 練習履歴リポジトリのプロバイダー
///
/// Copied from [practiceHistoryRepository].
@ProviderFor(practiceHistoryRepository)
final practiceHistoryRepositoryProvider =
    AutoDisposeFutureProvider<PracticeHistoryRepository>.internal(
  practiceHistoryRepository,
  name: r'practiceHistoryRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$practiceHistoryRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PracticeHistoryRepositoryRef
    = AutoDisposeFutureProviderRef<PracticeHistoryRepository>;
String _$practiceStatsHash() => r'c0ff3d0f0470ed5d47cac3cb4c700d8b5d9d85b8';

/// 統計情報のプロバイダー
///
/// Copied from [practiceStats].
@ProviderFor(practiceStats)
final practiceStatsProvider = AutoDisposeFutureProvider<PracticeStats>.internal(
  practiceStats,
  name: r'practiceStatsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$practiceStatsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PracticeStatsRef = AutoDisposeFutureProviderRef<PracticeStats>;
String _$weeklyDataHash() => r'6c0cd42f642f68894ef172fe62063cce034f4c3d';

/// 週次データのプロバイダー
///
/// Copied from [weeklyData].
@ProviderFor(weeklyData)
final weeklyDataProvider = AutoDisposeFutureProvider<List<int>>.internal(
  weeklyData,
  name: r'weeklyDataProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$weeklyDataHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef WeeklyDataRef = AutoDisposeFutureProviderRef<List<int>>;
String _$practiceSessionsHash() => r'1c2a040e009423a6e7975853cc129b0293651ab3';

/// 練習セッションリストのプロバイダー
///
/// Copied from [PracticeSessions].
@ProviderFor(PracticeSessions)
final practiceSessionsProvider = AutoDisposeAsyncNotifierProvider<
    PracticeSessions, List<PracticeSession>>.internal(
  PracticeSessions.new,
  name: r'practiceSessionsProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$practiceSessionsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$PracticeSessions = AutoDisposeAsyncNotifier<List<PracticeSession>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
