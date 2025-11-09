import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../shared/constants/app_colors.dart';
import '../../providers/practice_provider.dart';

/// 練習画面
class PracticeScreen extends ConsumerStatefulWidget {
  const PracticeScreen({super.key});

  @override
  ConsumerState<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends ConsumerState<PracticeScreen> {
  final TextEditingController _urlController = TextEditingController();
  YoutubePlayerController? _youtubeController;
  bool _isLoading = false;

  @override
  void dispose() {
    _urlController.dispose();
    _youtubeController?.close();
    super.dispose();
  }

  Future<void> _loadVideo() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    final videoId = ref.read(practiceProvider.notifier).extractVideoId(url);
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

    // 少し待機してからコントローラーを作成
    await Future.delayed(const Duration(milliseconds: 500));

    if (!mounted) return;

    try {
      ref.read(practiceProvider.notifier).setVideoId(url);

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

      // 動画読み込み後に監視を開始
      _startMonitoring();
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

  void _startMonitoring() {
    // 定期的に再生位置をチェック
    Future.doWhile(() async {
      if (_youtubeController == null || !mounted) return false;

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

          // ABループ処理
          final state = ref.read(practiceProvider);
          if (state.isLooping &&
              currentTime >= state.loopEnd &&
              state.loopEnd > 0) {
            await _youtubeController!
                .seekTo(seconds: state.loopStart.toDouble());
          }
        }

        await Future.delayed(const Duration(milliseconds: 100));
        return mounted && _youtubeController != null;
      } catch (e) {
        return false;
      }
    });
  }

  String _formatTime(double seconds) {
    final minutes = (seconds / 60).floor();
    final secs = (seconds % 60).floor();
    return '$minutes:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(practiceProvider);

    return Scaffold(
      body: SingleChildScrollView(
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
                  onPressed: _loadVideo,
                  child: const Text('読み込む'),
                ),
              ],
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
                                style:
                                    const TextStyle(color: AppColors.textGray),
                              ),
                              Text(
                                'B: ${_formatTime(state.loopEnd)}',
                                style:
                                    const TextStyle(color: AppColors.textGray),
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
                                  side: const BorderSide(
                                      color: AppColors.primary),
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
                                  side: const BorderSide(
                                      color: AppColors.primary),
                                ),
                                child: const Text('B'),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.clear),
                                color: AppColors.error,
                                onPressed: () {
                                  ref
                                      .read(practiceProvider.notifier)
                                      .clearLoop();
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
            ],
          ],
        ),
      ),
    );
  }
}
