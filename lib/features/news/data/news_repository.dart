import '../domain/news_article.dart';

/// ニュース記事のリポジトリ
/// 将来的にSupabase連携やAPI通信を実装予定
class NewsRepository {
  NewsRepository();

  /// ニュース記事一覧を取得
  /// 現在はダミーデータを返す
  Future<List<NewsArticle>> getArticles() async {
    // TODO: Supabase連携またはAPI通信を実装
    await Future.delayed(const Duration(milliseconds: 500));

    return [
      NewsArticle(
        id: '1',
        title: 'Fender新製品発表',
        excerpt: '新しいStratocasterシリーズが登場',
        image: 'https://via.placeholder.com/400x200',
        date: '2025-11-15',
        category: '新製品',
      ),
      NewsArticle(
        id: '2',
        title: 'ギター練習の効果的な方法',
        excerpt: 'プロが教える上達のコツ',
        image: 'https://via.placeholder.com/400x200',
        date: '2025-11-14',
        category: 'レビュー',
      ),
    ];
  }

  /// カテゴリ別にニュース記事を取得
  Future<List<NewsArticle>> getArticlesByCategory(String category) async {
    final articles = await getArticles();
    return articles.where((article) => article.category == category).toList();
  }
}
