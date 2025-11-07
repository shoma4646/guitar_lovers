import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
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

  @override
  void dispose() {
    _urlController.dispose();
    _youtubeController?.dispose();
    super.dispose();
  }

  void _loadVideo() {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    final videoId = ref.read(practiceProvider.notifier).extractVideoId(url);
    if (videoId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('無効なYouTube URLです')),
      );
      return;
    }

    ref.read(practiceProvider.notifier).setVideoId(url);

    setState(() {
      _youtubeController?.dispose();
      _youtubeController = YoutubePlayerController(
        initialVideoId: videoId,
        flags: const YoutubePlayerFlags(
          autoPlay: false,
          mute: false,
        ),
      )..addListener(_videoListener);
    });
  }

  void _videoListener() {
    if (_youtubeController == null) return;

    final state = ref.read(practiceProvider);
    final currentTime = _youtubeController!.value.position.inSeconds.toDouble();

    ref.read(practiceProvider.notifier).updateCurrentTime(currentTime);

    // ABループ処理
    if (state.isLooping && currentTime >= state.loopEnd && state.loopEnd > 0) {
      _youtubeController!.seekTo(Duration(seconds: state.loopStart.toInt()));
    }

    // 動画の長さを更新
    if (state.duration == 0) {
      final duration = _youtubeController!.metadata.duration.inSeconds.toDouble();
      if (duration > 0) {
        ref.read(practiceProvider.notifier).setDuration(duration);
      }
    }
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

            // YouTubeプレーヤー
            if (_youtubeController != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: YoutubePlayer(
                  controller: _youtubeController!,
                  showVideoProgressIndicator: true,
                  progressIndicatorColor: AppColors.primary,
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
                            onChanged: (value) {
                              _youtubeController?.seekTo(
                                Duration(seconds: value.toInt()),
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
                          onPressed: () {
                            final newTime = (state.currentTime - 10).clamp(0.0, state.duration);
                            _youtubeController?.seekTo(
                              Duration(seconds: newTime.toInt()),
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
                              _youtubeController!.value.isPlaying
                                  ? Icons.pause
                                  : Icons.play_arrow,
                              size: 36,
                            ),
                            color: AppColors.textWhite,
                            onPressed: () {
                              if (_youtubeController!.value.isPlaying) {
                                _youtubeController!.pause();
                              } else {
                                _youtubeController!.play();
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 16),
                        IconButton(
                          icon: const Icon(Icons.forward_10, size: 32),
                          color: AppColors.textWhite,
                          onPressed: () {
                            final newTime = (state.currentTime + 10).clamp(0.0, state.duration);
                            _youtubeController?.seekTo(
                              Duration(seconds: newTime.toInt()),
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
                          onSelected: (selected) {
                            if (selected) {
                              _youtubeController?.setPlaybackRate(speed);
                              ref.read(practiceProvider.notifier).setPlaybackRate(speed);
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
                                  Icons.settings,
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
                                  ref.read(practiceProvider.notifier).toggleLoop();
                                },
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton(
                                onPressed: () {
                                  ref.read(practiceProvider.notifier).setLoopStart();
                                },
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary),
                                ),
                                child: const Text('A'),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton(
                                onPressed: () {
                                  ref.read(practiceProvider.notifier).setLoopEnd();
                                },
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary),
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
            ],
          ],
        ),
      ),
    );
  }
}
