import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../domain/practice_video.dart';

/// 練習動画リポジトリ
class PracticeVideoRepository {
  final SharedPreferences _prefs;

  static const String _favoritesKey = 'favorite_videos';
  static const String _bookmarksKey = 'video_bookmarks';
  static const String _recentVideosKey = 'recent_videos';

  PracticeVideoRepository(this._prefs);

  /// お気に入り動画を取得
  Future<List<PracticeVideo>> getFavoriteVideos() async {
    final jsonString = _prefs.getString(_favoritesKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList
        .map((json) => PracticeVideo.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// お気に入り動画を追加
  Future<void> addFavoriteVideo(PracticeVideo video) async {
    final favorites = await getFavoriteVideos();

    // 既に存在する場合は更新
    final existingIndex = favorites.indexWhere((v) => v.videoId == video.videoId);
    if (existingIndex >= 0) {
      favorites[existingIndex] = video.copyWith(isFavorite: true);
    } else {
      favorites.add(video.copyWith(isFavorite: true));
    }

    await _saveFavorites(favorites);
  }

  /// お気に入りから削除
  Future<void> removeFavoriteVideo(String videoId) async {
    final favorites = await getFavoriteVideos();
    favorites.removeWhere((v) => v.videoId == videoId);
    await _saveFavorites(favorites);
  }

  /// お気に入りを保存
  Future<void> _saveFavorites(List<PracticeVideo> favorites) async {
    final jsonString = json.encode(favorites.map((v) => v.toJson()).toList());
    await _prefs.setString(_favoritesKey, jsonString);
  }

  /// ブックマークを取得
  Future<List<VideoBookmark>> getBookmarks(String videoId) async {
    final jsonString = _prefs.getString(_bookmarksKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList
        .map((json) => VideoBookmark.fromJson(json as Map<String, dynamic>))
        .where((b) => b.videoId == videoId)
        .toList()
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
  }

  /// 全ブックマークを取得
  Future<List<VideoBookmark>> getAllBookmarks() async {
    final jsonString = _prefs.getString(_bookmarksKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList
        .map((json) => VideoBookmark.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// ブックマークを追加
  Future<void> addBookmark(VideoBookmark bookmark) async {
    final bookmarks = await getAllBookmarks();
    bookmarks.add(bookmark);
    await _saveBookmarks(bookmarks);
  }

  /// ブックマークを削除
  Future<void> removeBookmark(String bookmarkId) async {
    final bookmarks = await getAllBookmarks();
    bookmarks.removeWhere((b) => b.id == bookmarkId);
    await _saveBookmarks(bookmarks);
  }

  /// ブックマークを保存
  Future<void> _saveBookmarks(List<VideoBookmark> bookmarks) async {
    final jsonString = json.encode(bookmarks.map((b) => b.toJson()).toList());
    await _prefs.setString(_bookmarksKey, jsonString);
  }

  /// 最近視聴した動画を取得
  Future<List<PracticeVideo>> getRecentVideos() async {
    final jsonString = _prefs.getString(_recentVideosKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList
        .map((json) => PracticeVideo.fromJson(json as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => (b.lastWatched ?? DateTime(0))
          .compareTo(a.lastWatched ?? DateTime(0)));
  }

  /// 最近視聴した動画を追加
  Future<void> addRecentVideo(PracticeVideo video) async {
    final recentVideos = await getRecentVideos();

    // 既に存在する場合は削除
    recentVideos.removeWhere((v) => v.videoId == video.videoId);

    // 先頭に追加
    recentVideos.insert(
      0,
      video.copyWith(lastWatched: DateTime.now()),
    );

    // 最大10件まで保持
    if (recentVideos.length > 10) {
      recentVideos.removeRange(10, recentVideos.length);
    }

    await _saveRecentVideos(recentVideos);
  }

  /// 最近視聴した動画を保存
  Future<void> _saveRecentVideos(List<PracticeVideo> videos) async {
    final jsonString = json.encode(videos.map((v) => v.toJson()).toList());
    await _prefs.setString(_recentVideosKey, jsonString);
  }

  /// お気に入りかどうかを確認
  Future<bool> isFavorite(String videoId) async {
    final favorites = await getFavoriteVideos();
    return favorites.any((v) => v.videoId == videoId);
  }
}
