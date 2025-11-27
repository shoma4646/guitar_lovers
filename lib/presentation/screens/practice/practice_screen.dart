import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../../shared/constants/app_colors.dart';
import '../../../features/practice/application/practice_provider.dart';
import '../../../features/practice/application/practice_video_provider.dart';
import '../../../features/practice/domain/practice_video.dart';
import '../../../features/practice/domain/practice_state.dart';
import '../../../features/history/application/practice_history_provider.dart';
import '../../widgets/metronome_widget.dart';

/// 練習画面
class PracticeScreen extends ConsumerStatefulWidget {
  const PracticeScreen({super.key});

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _urlController = TextEditingController();
  final TextEditingController _bookmarkLabelController =
      TextEditingController();
  YoutubePlayerController? _youtubeController;
  bool _isLoading = false;
  late TabController _tabController;
  String? _currentVideoId;
  Timer? _monitoringTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _monitoringTimer?.cancel();
    _urlController.dispose();
    _bookmarkLabelController.dispose();
    _youtubeController?.close();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadVideo([String? url]) async {
    final targetUrl = url ?? _urlController.text.trim();
    if (targetUrl.isEmpty) return;

    final videoId =
        ref.read(practiceProvider.notifier).extractVideoId(targetUrl);
    if (videoId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('無効なYouTube URLです')),
        );
      }
      return;
    }

    setState(() {
      _isLoading = true;
      _youtubeController?.close();
      _youtubeController = null;
    });

    await Future.delayed(const Duration(milliseconds: 500));

    if (!mounted) return;

    try {
      ref.read(practiceProvider.notifier).setVideoId(targetUrl);
      _currentVideoId = videoId;

      setState(() {
        _youtubeController = YoutubePlayerController.fromVideoId(
          videoId: videoId,
          autoPlay: false,
          params: const YoutubePlayerParams(
            showFullscreenButton: true,
            mute: false,
            showControls: true,
            strictRelatedVideos: true,
          ),
        );
        _isLoading = false;
      });

      _startMonitoring();

      // タブを動画プレーヤーに切り替え
      _tabController.animateTo(0);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('動画の読み込みに失敗しました: $e')),
        );
      }
    }
  }

  void _loadVideoFromPreset(PracticeVideo video) {
    _urlController.text = video.youtubeUrl;
    _loadVideo(video.youtubeUrl);

    // 最近視聴した動画に追加
    ref.read(recentVideosProvider.notifier).addRecentVideo(video);
  }

  void _startMonitoring() {
    _monitoringTimer?.cancel();
    _monitoringTimer =
        Timer.periodic(const Duration(milliseconds: 100), (_) async {
      if (!mounted || _youtubeController == null) {
        _monitoringTimer?.cancel();
        return;
      }

      try {
        final currentTime = await _youtubeController!.currentTime;
        final duration = await _youtubeController!.duration;

        if (mounted) {
          ref
              .read(practiceProvider.notifier)
              .updateCurrentTime(currentTime.toDouble());

          if (ref.read(practiceProvider).duration == 0) {
            ref
                .read(practiceProvider.notifier)
                .setDuration(duration.toDouble());
          }

          final state = ref.read(practiceProvider);
          if (state.isLooping &&
              currentTime >= state.loopEnd &&
              state.loopEnd > 0) {
            await _youtubeController!
                .seekTo(seconds: state.loopStart.toDouble());
          }
        }
      } catch (e) {
        _monitoringTimer?.cancel();
      }
    });
  }

  String _formatTime(double seconds) {
    final minutes = (seconds / 60).floor();
    final secs = (seconds % 60).floor();
    return '$minutes:${secs.toString().padLeft(2, '0')}';
  }

  Future<void> _savePracticeSession() async {
    final practiceMinutes =
        ref.read(practiceProvider.notifier).getPracticeMinutes();
    if (practiceMinutes < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('練習時間が1分未満です')),
      );
      return;
    }

    await ref.read(practiceSessionsProvider.notifier).addSession(
          durationMinutes: practiceMinutes,
          notes: '練習動画での練習',
        );

    ref.read(practiceProvider.notifier).resetPracticeTime();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('練習時間 $practiceMinutes分 を記録しました')),
      );
    }
  }

  Future<void> _addBookmark() async {
    final state = ref.read(practiceProvider);
    if (_currentVideoId == null) return;

    final label = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ブックマークを追加'),
        content: TextField(
          controller: _bookmarkLabelController,
          decoration: const InputDecoration(
            hintText: 'ラベルを入力',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context, _bookmarkLabelController.text);
              _bookmarkLabelController.clear();
            },
            child: const Text('追加'),
          ),
        ],
      ),
    );

    if (label != null && label.isNotEmpty) {
      await ref
          .read(videoBookmarksProvider(_currentVideoId!).notifier)
          .addBookmark(
            timestamp: state.currentTime,
            label: label,
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  'ブックマーク "$label" を ${_formatTime(state.currentTime)} に追加しました')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(practiceProvider);

    return Scaffold(
      body: Column(
        children: [
          // タブバー
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: '練習'),
              Tab(text: 'プリセット'),
              Tab(text: 'お気に入り'),
            ],
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textGray,
            indicatorColor: AppColors.primary,
          ),

          // タブビュー
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // 練習タブ
                _buildPracticeTab(state),

                // プリセットタブ
                _buildPresetTab(),

                // お気に入りタブ
                _buildFavoritesTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPracticeTab(PracticeState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // URL入力欄
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _urlController,
                  decoration: const InputDecoration(
                    hintText: 'YouTube URLを入力',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => _loadVideo(),
                child: const Text('読み込む'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 練習時間表示
          if (_youtubeController != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.backgroundLightDark,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '練習時間',
                        style: TextStyle(
                          color: AppColors.textGray,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        '${ref.read(practiceProvider.notifier).getPracticeMinutes()}分',
                        style: const TextStyle(
                          color: AppColors.textWhite,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: _savePracticeSession,
                    icon: const Icon(Icons.save),
                    label: const Text('記録'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 16),

          // ローディングインジケーター
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(),
              ),
            ),

          // YouTubeプレーヤー
          if (_youtubeController != null && !_isLoading) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: YoutubePlayer(
                controller: _youtubeController!,
                aspectRatio: 16 / 9,
              ),
            ),
            const SizedBox(height: 16),

            // 再生コントロール
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.backgroundLightDark,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  // シークバー
                  Row(
                    children: [
                      Text(
                        _formatTime(state.currentTime),
                        style: const TextStyle(color: AppColors.textWhite),
                      ),
                      Expanded(
                        child: Slider(
                          value: state.currentTime.clamp(0.0, state.duration),
                          max: state.duration > 0 ? state.duration : 1.0,
                          activeColor: AppColors.primary,
                          onChanged: (value) async {
                            await _youtubeController?.seekTo(
                              seconds: value,
                            );
                          },
                        ),
                      ),
                      Text(
                        _formatTime(state.duration),
                        style: const TextStyle(color: AppColors.textWhite),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 再生ボタン
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.replay_10, size: 32),
                        color: AppColors.textWhite,
                        onPressed: () async {
                          final newTime = (state.currentTime - 10)
                              .clamp(0.0, state.duration);
                          await _youtubeController?.seekTo(
                            seconds: newTime,
                          );
                        },
                      ),
                      const SizedBox(width: 16),
                      Container(
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          icon: Icon(
                            state.isPlaying ? Icons.pause : Icons.play_arrow,
                            size: 36,
                          ),
                          color: AppColors.textWhite,
                          onPressed: () async {
                            if (state.isPlaying) {
                              await _youtubeController?.pauseVideo();
                              ref
                                  .read(practiceProvider.notifier)
                                  .togglePlaying();
                            } else {
                              await _youtubeController?.playVideo();
                              ref
                                  .read(practiceProvider.notifier)
                                  .togglePlaying();
                            }
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      IconButton(
                        icon: const Icon(Icons.forward_10, size: 32),
                        color: AppColors.textWhite,
                        onPressed: () async {
                          final newTime = (state.currentTime + 10)
                              .clamp(0.0, state.duration);
                          await _youtubeController?.seekTo(
                            seconds: newTime,
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 再生速度調整
                  Wrap(
                    spacing: 8,
                    alignment: WrapAlignment.center,
                    children: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) {
                      return ChoiceChip(
                        label: Text('${speed}x'),
                        selected: state.playbackRate == speed,
                        onSelected: (selected) async {
                          if (selected) {
                            await _youtubeController?.setPlaybackRate(speed);
                            ref
                                .read(practiceProvider.notifier)
                                .setPlaybackRate(speed);
                          }
                        },
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.backgroundGray,
                        labelStyle: TextStyle(
                          color: state.playbackRate == speed
                              ? AppColors.textWhite
                              : AppColors.textGray,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // ABループコントロール
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundGray,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'A: ${_formatTime(state.loopStart)}',
                              style: const TextStyle(color: AppColors.textGray),
                            ),
                            Text(
                              'B: ${_formatTime(state.loopEnd)}',
                              style: const TextStyle(color: AppColors.textGray),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton(
                              icon: Icon(
                                Icons.loop,
                                color: state.isLooping
                                    ? AppColors.textWhite
                                    : AppColors.primary,
                              ),
                              style: IconButton.styleFrom(
                                backgroundColor: state.isLooping
                                    ? AppColors.primary
                                    : AppColors.backgroundLightDark,
                              ),
                              onPressed: () {
                                ref
                                    .read(practiceProvider.notifier)
                                    .toggleLoop();
                              },
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton(
                              onPressed: () {
                                ref
                                    .read(practiceProvider.notifier)
                                    .setLoopStart();
                              },
                              style: OutlinedButton.styleFrom(
                                side:
                                    const BorderSide(color: AppColors.primary),
                              ),
                              child: const Text('A'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton(
                              onPressed: () {
                                ref
                                    .read(practiceProvider.notifier)
                                    .setLoopEnd();
                              },
                              style: OutlinedButton.styleFrom(
                                side:
                                    const BorderSide(color: AppColors.primary),
                              ),
                              child: const Text('B'),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.clear),
                              color: AppColors.error,
                              onPressed: () {
                                ref.read(practiceProvider.notifier).clearLoop();
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ブックマーク追加ボタン
            if (_currentVideoId != null)
              ElevatedButton.icon(
                onPressed: _addBookmark,
                icon: const Icon(Icons.bookmark_add),
                label: const Text('現在位置をブックマーク'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.backgroundLightDark,
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
            const SizedBox(height: 16),

            // ブックマークリスト
            if (_currentVideoId != null) _buildBookmarksList(),

            const SizedBox(height: 16),

            // メトロノーム
            MetronomeWidget(
              bpm: state.metronomeBpm,
              isEnabled: state.isMetronomeEnabled,
              onBpmChanged: (bpm) {
                ref.read(practiceProvider.notifier).setMetronomeBpm(bpm);
              },
              onToggle: () {
                ref.read(practiceProvider.notifier).toggleMetronome();
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBookmarksList() {
    final bookmarksAsync = ref.watch(videoBookmarksProvider(_currentVideoId!));

    return bookmarksAsync.when(
      data: (bookmarks) {
        if (bookmarks.isEmpty) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.backgroundLightDark,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'ブックマーク',
                style: TextStyle(
                  color: AppColors.textWhite,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ...bookmarks.map((bookmark) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      bookmark.label,
                      style: const TextStyle(color: AppColors.textWhite),
                    ),
                    subtitle: Text(
                      _formatTime(bookmark.timestamp),
                      style: const TextStyle(color: AppColors.textGray),
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      color: AppColors.error,
                      onPressed: () {
                        ref
                            .read(videoBookmarksProvider(_currentVideoId!)
                                .notifier)
                            .removeBookmark(bookmark.id);
                      },
                    ),
                    onTap: () async {
                      await _youtubeController?.seekTo(
                        seconds: bookmark.timestamp,
                      );
                    },
                  )),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildPresetTab() {
    final videosByCategoryAsync = ref.watch(videosByCategoryProvider);

    return videosByCategoryAsync.when(
      data: (videosByCategory) => SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'おすすめ練習動画',
              style: TextStyle(
                color: AppColors.textWhite,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // カテゴリ別に表示
            ...videosByCategory.entries.map((entry) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.key.displayName,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...entry.value.map((video) => _buildVideoCard(video)),
                  const SizedBox(height: 16),
                ],
              );
            }),
          ],
        ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('エラーが発生しました: $error')),
    );
  }

  Widget _buildFavoritesTab() {
    final favoritesAsync = ref.watch(favoriteVideosProvider);
    final recentAsync = ref.watch(recentVideosProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 最近視聴した動画
          const Text(
            '最近視聴した動画',
            style: TextStyle(
              color: AppColors.textWhite,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          recentAsync.when(
            data: (videos) {
              if (videos.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'まだ動画を視聴していません',
                    style: TextStyle(color: AppColors.textGray),
                  ),
                );
              }
              return Column(
                children: videos
                    .take(5)
                    .map((video) => _buildVideoCard(video))
                    .toList(),
              );
            },
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const Text('エラーが発生しました'),
          ),

          const SizedBox(height: 24),

          // お気に入り
          const Text(
            'お気に入り',
            style: TextStyle(
              color: AppColors.textWhite,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          favoritesAsync.when(
            data: (videos) {
              if (videos.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'お気に入りの動画はありません',
                    style: TextStyle(color: AppColors.textGray),
                  ),
                );
              }
              return Column(
                children:
                    videos.map((video) => _buildVideoCard(video)).toList(),
              );
            },
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const Text('エラーが発生しました'),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoCard(PracticeVideo video) {
    return Card(
      color: AppColors.backgroundLightDark,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(
          video.title,
          style: const TextStyle(color: AppColors.textWhite),
        ),
        subtitle: Text(
          video.category.displayName,
          style: const TextStyle(color: AppColors.textGray),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: Icon(
                video.isFavorite ? Icons.favorite : Icons.favorite_border,
                color: video.isFavorite ? AppColors.error : AppColors.textGray,
              ),
              onPressed: () {
                ref.read(favoriteVideosProvider.notifier).toggleFavorite(video);
              },
            ),
            const Icon(
              Icons.play_circle_outline,
              color: AppColors.primary,
            ),
          ],
        ),
        onTap: () => _loadVideoFromPreset(video),
      ),
    );
  }
}
