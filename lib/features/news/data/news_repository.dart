import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import '../domain/news_article.dart';

/// ニュース記事のリポジトリ
/// 将来的にSupabase連携やAPI通信を実装予定
class NewsRepository {
  NewsRepository();

  /// ニュース記事一覧を取得
  Future<List<NewsArticle>> getArticles() async {
    final jsonString = await rootBundle.loadString('assets/json/news.json');
    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList
        .map((json) => NewsArticle.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// カテゴリ別にニュース記事を取得
  Future<List<NewsArticle>> getArticlesByCategory(String category) async {
    final articles = await getArticles();
    return articles.where((article) => article.category == category).toList();
  }
}
