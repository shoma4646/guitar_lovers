import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../data/news_repository.dart';
import '../domain/news_article.dart';

part 'news_provider.g.dart';

/// ニュースリポジトリのプロバイダー
@riverpod
NewsRepository newsRepository(NewsRepositoryRef ref) {
  return NewsRepository();
}

/// ニュース記事一覧のプロバイダー
@riverpod
Future<List<NewsArticle>> newsArticles(NewsArticlesRef ref) async {
  final repository = ref.watch(newsRepositoryProvider);
  return await repository.getArticles();
}

/// カテゴリ別ニュース記事のプロバイダー
@riverpod
Future<List<NewsArticle>> newsArticlesByCategory(
  NewsArticlesByCategoryRef ref,
  String category,
) async {
  final repository = ref.watch(newsRepositoryProvider);
  return await repository.getArticlesByCategory(category);
}
