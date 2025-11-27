import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/practice_video_repository.dart';
import '../domain/practice_video.dart';

part 'practice_video_provider.g.dart';

/// 練習動画リポジトリのプロバイダー
@riverpod
Future<PracticeVideoRepository> practiceVideoRepository(Ref ref) async {
  final prefs = await SharedPreferences.getInstance();
  return PracticeVideoRepository(prefs);
}

/// お気に入り動画のプロバイダー
@riverpod
class FavoriteVideos extends _$FavoriteVideos {
  @override
  Future<List<PracticeVideo>> build() async {
    final repository = await ref.watch(practiceVideoRepositoryProvider.future);
    return repository.getFavoriteVideos();
  }

  /// お気に入りを追加
  Future<void> addFavorite(PracticeVideo video) async {
    final repository = await ref.read(practiceVideoRepositoryProvider.future);
    await repository.addFavoriteVideo(video);
    ref.invalidateSelf();
  }

  /// お気に入りから削除
  Future<void> removeFavorite(String videoId) async {
    final repository = await ref.read(practiceVideoRepositoryProvider.future);
    await repository.removeFavoriteVideo(videoId);
    ref.invalidateSelf();
  }

  /// お気に入りの切り替え
  Future<void> toggleFavorite(PracticeVideo video) async {
    final repository = await ref.read(practiceVideoRepositoryProvider.future);
    final isFav = await repository.isFavorite(video.videoId);
    if (isFav) {
      await repository.removeFavoriteVideo(video.videoId);
    } else {
      await repository.addFavoriteVideo(video);
    }
    ref.invalidateSelf();
  }
}

/// 最近視聴した動画のプロバイダー
@riverpod
class RecentVideos extends _$RecentVideos {
  @override
  Future<List<PracticeVideo>> build() async {
    final repository = await ref.watch(practiceVideoRepositoryProvider.future);
    return repository.getRecentVideos();
  }

  /// 最近視聴した動画を追加
  Future<void> addRecentVideo(PracticeVideo video) async {
    final repository = await ref.read(practiceVideoRepositoryProvider.future);
    await repository.addRecentVideo(video);
    ref.invalidateSelf();
  }
}

/// ブックマークのプロバイダー
@riverpod
class VideoBookmarks extends _$VideoBookmarks {
  @override
  Future<List<VideoBookmark>> build(String videoId) async {
    final repository = await ref.watch(practiceVideoRepositoryProvider.future);
    return repository.getBookmarks(videoId);
  }

  /// ブックマークを追加
  Future<void> addBookmark({
    required double timestamp,
    required String label,
  }) async {
    final repository = await ref.read(practiceVideoRepositoryProvider.future);
    final bookmark = VideoBookmark.create(
      videoId: arg,
      timestamp: timestamp,
      label: label,
    );
    await repository.addBookmark(bookmark);
    ref.invalidateSelf();
  }

  /// ブックマークを削除
  Future<void> removeBookmark(String bookmarkId) async {
    final repository = await ref.read(practiceVideoRepositoryProvider.future);
    await repository.removeBookmark(bookmarkId);
    ref.invalidateSelf();
  }

  /// videoIdを取得するためのゲッター
  String get arg => videoId;
}

/// プリセット動画のプロバイダー
@riverpod
Future<List<PracticeVideo>> presetVideos(Ref ref) async {
  final jsonString =
      await rootBundle.loadString('assets/json/practice_presets.json');
  final List<dynamic> jsonList = json.decode(jsonString);
  return jsonList
      .map((json) => PracticeVideo.fromJson(json as Map<String, dynamic>))
      .toList();
}

/// カテゴリ別動画のプロバイダー
@riverpod
Future<Map<PracticeCategory, List<PracticeVideo>>> videosByCategory(
    Ref ref) async {
  final presets = await ref.watch(presetVideosProvider.future);
  final Map<PracticeCategory, List<PracticeVideo>> categorized = {};

  for (final video in presets) {
    categorized.putIfAbsent(video.category, () => []).add(video);
  }

  return categorized;
}
