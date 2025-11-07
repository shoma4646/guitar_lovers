/// ニュース記事モデル
class NewsArticle {
  final String id;
  final String title;
  final String excerpt;
  final String image;
  final String date;
  final String category;

  NewsArticle({
    required this.id,
    required this.title,
    required this.excerpt,
    required this.image,
    required this.date,
    required this.category,
  });

  factory NewsArticle.fromJson(Map<String, dynamic> json) {
    return NewsArticle(
      id: json['id'] as String,
      title: json['title'] as String,
      excerpt: json['excerpt'] as String,
      image: json['image'] as String,
      date: json['date'] as String,
      category: json['category'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'excerpt': excerpt,
      'image': image,
      'date': date,
      'category': category,
    };
  }
}
