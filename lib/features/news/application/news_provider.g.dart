// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'news_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$newsRepositoryHash() => r'5cd4c431e76e54100ee36f4ac9b1b762edfa1895';

/// ニュースリポジトリのプロバイダー
///
/// Copied from [newsRepository].
@ProviderFor(newsRepository)
final newsRepositoryProvider = AutoDisposeProvider<NewsRepository>.internal(
  newsRepository,
  name: r'newsRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$newsRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef NewsRepositoryRef = AutoDisposeProviderRef<NewsRepository>;
String _$newsArticlesHash() => r'd289ddaab567727ec5d84fd798e0915c17c00288';

/// ニュース記事一覧のプロバイダー
///
/// Copied from [newsArticles].
@ProviderFor(newsArticles)
final newsArticlesProvider =
    AutoDisposeFutureProvider<List<NewsArticle>>.internal(
  newsArticles,
  name: r'newsArticlesProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$newsArticlesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef NewsArticlesRef = AutoDisposeFutureProviderRef<List<NewsArticle>>;
String _$newsArticlesByCategoryHash() =>
    r'ef7857d222fed95670c2f2220640758b9a16a503';

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

/// カテゴリ別ニュース記事のプロバイダー
///
/// Copied from [newsArticlesByCategory].
@ProviderFor(newsArticlesByCategory)
const newsArticlesByCategoryProvider = NewsArticlesByCategoryFamily();

/// カテゴリ別ニュース記事のプロバイダー
///
/// Copied from [newsArticlesByCategory].
class NewsArticlesByCategoryFamily
    extends Family<AsyncValue<List<NewsArticle>>> {
  /// カテゴリ別ニュース記事のプロバイダー
  ///
  /// Copied from [newsArticlesByCategory].
  const NewsArticlesByCategoryFamily();

  /// カテゴリ別ニュース記事のプロバイダー
  ///
  /// Copied from [newsArticlesByCategory].
  NewsArticlesByCategoryProvider call(
    String category,
  ) {
    return NewsArticlesByCategoryProvider(
      category,
    );
  }

  @override
  NewsArticlesByCategoryProvider getProviderOverride(
    covariant NewsArticlesByCategoryProvider provider,
  ) {
    return call(
      provider.category,
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
  String? get name => r'newsArticlesByCategoryProvider';
}

/// カテゴリ別ニュース記事のプロバイダー
///
/// Copied from [newsArticlesByCategory].
class NewsArticlesByCategoryProvider
    extends AutoDisposeFutureProvider<List<NewsArticle>> {
  /// カテゴリ別ニュース記事のプロバイダー
  ///
  /// Copied from [newsArticlesByCategory].
  NewsArticlesByCategoryProvider(
    String category,
  ) : this._internal(
          (ref) => newsArticlesByCategory(
            ref as NewsArticlesByCategoryRef,
            category,
          ),
          from: newsArticlesByCategoryProvider,
          name: r'newsArticlesByCategoryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$newsArticlesByCategoryHash,
          dependencies: NewsArticlesByCategoryFamily._dependencies,
          allTransitiveDependencies:
              NewsArticlesByCategoryFamily._allTransitiveDependencies,
          category: category,
        );

  NewsArticlesByCategoryProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.category,
  }) : super.internal();

  final String category;

  @override
  Override overrideWith(
    FutureOr<List<NewsArticle>> Function(NewsArticlesByCategoryRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: NewsArticlesByCategoryProvider._internal(
        (ref) => create(ref as NewsArticlesByCategoryRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        category: category,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<NewsArticle>> createElement() {
    return _NewsArticlesByCategoryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is NewsArticlesByCategoryProvider &&
        other.category == category;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, category.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin NewsArticlesByCategoryRef
    on AutoDisposeFutureProviderRef<List<NewsArticle>> {
  /// The parameter `category` of this provider.
  String get category;
}

class _NewsArticlesByCategoryProviderElement
    extends AutoDisposeFutureProviderElement<List<NewsArticle>>
    with NewsArticlesByCategoryRef {
  _NewsArticlesByCategoryProviderElement(super.provider);

  @override
  String get category => (origin as NewsArticlesByCategoryProvider).category;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
