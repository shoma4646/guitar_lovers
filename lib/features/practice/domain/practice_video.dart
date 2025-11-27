import 'package:uuid/uuid.dart';

/// 練習動画のデータモデル
class PracticeVideo {
  /// 動画ID（UUID）
  final String id;

  /// YouTubeビデオID
  final String videoId;

  /// タイトル
  final String title;

  /// カテゴリ
  final PracticeCategory category;

  /// お気に入りフラグ
  final bool isFavorite;

  /// 最後に視聴した日時
  final DateTime? lastWatched;

  /// メモ
  final String? notes;

  const PracticeVideo({
    required this.id,
    required this.videoId,
    required this.title,
    required this.category,
    this.isFavorite = false,
    this.lastWatched,
    this.notes,
  });

  /// ファクトリーコンストラクタ：新規動画作成
  factory PracticeVideo.create({
    required String videoId,
    required String title,
    required PracticeCategory category,
    String? notes,
  }) {
    return PracticeVideo(
      id: const Uuid().v4(),
      videoId: videoId,
      title: title,
      category: category,
      notes: notes,
    );
  }

  /// JSONからデシリアライズ
  factory PracticeVideo.fromJson(Map<String, dynamic> json) {
    return PracticeVideo(
      id: json['id'] as String,
      videoId: json['videoId'] as String,
      title: json['title'] as String,
      category: PracticeCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => PracticeCategory.other,
      ),
      isFavorite: json['isFavorite'] as bool? ?? false,
      lastWatched: json['lastWatched'] != null
          ? DateTime.parse(json['lastWatched'] as String)
          : null,
      notes: json['notes'] as String?,
    );
  }

  /// JSONへシリアライズ
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'videoId': videoId,
      'title': title,
      'category': category.name,
      'isFavorite': isFavorite,
      'lastWatched': lastWatched?.toIso8601String(),
      'notes': notes,
    };
  }

  /// コピーメソッド
  PracticeVideo copyWith({
    String? id,
    String? videoId,
    String? title,
    PracticeCategory? category,
    bool? isFavorite,
    DateTime? lastWatched,
    String? notes,
  }) {
    return PracticeVideo(
      id: id ?? this.id,
      videoId: videoId ?? this.videoId,
      title: title ?? this.title,
      category: category ?? this.category,
      isFavorite: isFavorite ?? this.isFavorite,
      lastWatched: lastWatched ?? this.lastWatched,
      notes: notes ?? this.notes,
    );
  }

  /// YouTube URLを取得
  String get youtubeUrl => 'https://www.youtube.com/watch?v=$videoId';
}

/// 練習カテゴリ
enum PracticeCategory {
  chord('コード練習'),
  scale('スケール練習'),
  fingerpicking('フィンガーピッキング'),
  strumming('ストローク'),
  theory('音楽理論'),
  song('曲の練習'),
  technique('テクニック'),
  other('その他');

  final String displayName;
  const PracticeCategory(this.displayName);
}

/// ブックマークのデータモデル
class VideoBookmark {
  /// ブックマークID
  final String id;

  /// 動画ID（PracticeVideoのID）
  final String videoId;

  /// 時間（秒）
  final double timestamp;

  /// ラベル
  final String label;

  /// 作成日時
  final DateTime createdAt;

  const VideoBookmark({
    required this.id,
    required this.videoId,
    required this.timestamp,
    required this.label,
    required this.createdAt,
  });

  /// ファクトリーコンストラクタ
  factory VideoBookmark.create({
    required String videoId,
    required double timestamp,
    required String label,
  }) {
    return VideoBookmark(
      id: const Uuid().v4(),
      videoId: videoId,
      timestamp: timestamp,
      label: label,
      createdAt: DateTime.now(),
    );
  }

  /// JSONからデシリアライズ
  factory VideoBookmark.fromJson(Map<String, dynamic> json) {
    return VideoBookmark(
      id: json['id'] as String,
      videoId: json['videoId'] as String,
      timestamp: (json['timestamp'] as num).toDouble(),
      label: json['label'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// JSONへシリアライズ
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'videoId': videoId,
      'timestamp': timestamp,
      'label': label,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
