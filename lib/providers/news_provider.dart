import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/news_article.dart';

/// ニュース記事リストのプロバイダー
final newsProvider = Provider<List<NewsArticle>>((ref) {
  return [
    NewsArticle(
      id: '1',
      title: 'Fenderが新しいVintageシリーズを発表',
      excerpt: '伝統的なデザインと最新のテクノロジーを組み合わせた新シリーズ...',
      image:
          'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800',
      date: '2024/03/15',
      category: '新製品',
    ),
    NewsArticle(
      id: '2',
      title: '著名ギタリストの来日公演が決定',
      excerpt: '世界的に有名なギタリストが5年ぶりの来日公演を発表...',
      image:
          'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=800',
      date: '2024/03/14',
      category: 'イベント',
    ),
  ];
});
