import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../../shared/constants/app_colors.dart';
import '../../../features/metronome/application/metronome_provider.dart';

/// メトロノーム画面の定数
class _ScreenConstants {
  _ScreenConstants._();

  static const double mainCircleSize = 200.0;
  static const double borderWidth = 4.0;
  static const Duration beatAnimationDuration = Duration(milliseconds: 100);
  static const Duration glowAnimationDuration = Duration(milliseconds: 100);
}

/// メトロノーム画面
class MetronomeScreen extends ConsumerStatefulWidget {
  const MetronomeScreen({super.key});

  @override
  ConsumerState<MetronomeScreen> createState() => _MetronomeScreenState();
}

class _MetronomeScreenState extends ConsumerState<MetronomeScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  bool _isBeating = false;
  late AnimationController _animationController;

  /// オーディオプレーヤー
  AudioPlayer? _clickPlayer;
  AudioPlayer? _accentPlayer;

  /// オーディオ初期化完了フラグ
  bool _isAudioReady = false;

  /// オーディオ初期化失敗フラグ
  bool _audioInitFailed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _animationController = AnimationController(
      vsync: this,
      duration: _ScreenConstants.beatAnimationDuration,
    );
    _initAudioPlayers();

    // ビートコールバックを登録（次のフレームで実行）
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(metronomeProvider.notifier).registerBeatCallback(_onBeat);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // アプリがバックグラウンドに移行した際にメトロノームを停止
    if (state == AppLifecycleState.paused) {
      ref.read(metronomeProvider.notifier).stop();
    }
  }

  Future<void> _initAudioPlayers() async {
    try {
      _clickPlayer = AudioPlayer();
      _accentPlayer = AudioPlayer();

      await _clickPlayer!.setSource(AssetSource('audio/metronome_click.wav'));
      await _accentPlayer!.setSource(AssetSource('audio/metronome_accent.wav'));
      await _clickPlayer!.setReleaseMode(ReleaseMode.stop);
      await _accentPlayer!.setReleaseMode(ReleaseMode.stop);

      if (mounted) {
        setState(() {
          _isAudioReady = true;
          _audioInitFailed = false;
        });
      }
    } catch (e) {
      debugPrint('Failed to initialize audio players: $e');
      // プレイヤーをクリーンアップ
      await _clickPlayer?.dispose();
      await _accentPlayer?.dispose();
      _clickPlayer = null;
      _accentPlayer = null;

      if (mounted) {
        setState(() {
          _isAudioReady = false;
          _audioInitFailed = true;
        });
      }
    }
  }

  /// ビート発生時のコールバック（Notifierから呼ばれる）
  void _onBeat() {
    if (!mounted) return;

    final state = ref.read(metronomeProvider);

    setState(() {
      _isBeating = true;
    });

    _animationController.forward().then((_) {
      _animationController.reverse();
      if (mounted) {
        setState(() {
          _isBeating = false;
        });
      }
    });

    // 音を再生（currentBeatは次のビートに進む前の値）
    if (_isAudioReady) {
      _playSound(state.accentEnabled && state.currentBeat == 0);
    }

    // 触覚フィードバック
    HapticFeedback.lightImpact();
  }

  void _playSound(bool isAccent) {
    try {
      if (isAccent && _accentPlayer != null) {
        _accentPlayer!.stop().then((_) => _accentPlayer!.resume());
      } else if (_clickPlayer != null) {
        _clickPlayer!.stop().then((_) => _clickPlayer!.resume());
      }
    } catch (e) {
      debugPrint('Metronome audio error: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _animationController.dispose();
    _clickPlayer?.dispose();
    _accentPlayer?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(metronomeProvider);
    final notifier = ref.read(metronomeProvider.notifier);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // 音声初期化失敗時の警告
              if (_audioInitFailed)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.error),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber, color: AppColors.error),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '音声の初期化に失敗しました。\n視覚・触覚フィードバックのみで動作します。',
                          style: TextStyle(
                            color: AppColors.error,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              const Spacer(),

              // メインBPM表示
              GestureDetector(
                onTap: () => notifier.toggle(),
                child: AnimatedContainer(
                  duration: _ScreenConstants.glowAnimationDuration,
                  width: _ScreenConstants.mainCircleSize,
                  height: _ScreenConstants.mainCircleSize,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isBeating
                        ? AppColors.primary
                        : AppColors.backgroundLightDark,
                    border: Border.all(
                      color: state.isEnabled
                          ? AppColors.primary
                          : AppColors.textGray,
                      width: _ScreenConstants.borderWidth,
                    ),
                    boxShadow: state.isEnabled
                        ? [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.3),
                              blurRadius: 20,
                              spreadRadius: 5,
                            ),
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${state.bpm}',
                        style: const TextStyle(
                          color: AppColors.textWhite,
                          fontSize: 64,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'BPM',
                        style: TextStyle(
                          color: AppColors.textGray,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // タップで開始/停止の説明
              Text(
                state.isEnabled ? 'タップで停止' : 'タップで開始',
                style: const TextStyle(
                  color: AppColors.textGray,
                  fontSize: 14,
                ),
              ),

              const SizedBox(height: 30),

              // ビートインジケーター
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(state.beatsPerMeasure, (index) {
                  final isActive = state.isEnabled && state.currentBeat == index;
                  final isAccent = index == 0 && state.accentEnabled;
                  return AnimatedContainer(
                    duration: _ScreenConstants.beatAnimationDuration,
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    width: isAccent ? 20 : 16,
                    height: isAccent ? 20 : 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isActive
                          ? (isAccent
                              ? AppColors.secondary
                              : AppColors.primary)
                          : AppColors.backgroundLightDark,
                      border: Border.all(
                        color:
                            isAccent ? AppColors.secondary : AppColors.primary,
                        width: 2,
                      ),
                    ),
                  );
                }),
              ),

              const Spacer(),

              // BPM調整スライダー
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 32),
                    color: AppColors.textGray,
                    onPressed: () {
                      if (state.bpm > MetronomeConstants.minBPM) {
                        notifier.setBpm(state.bpm - MetronomeConstants.bpmStep);
                      }
                    },
                  ),
                  Expanded(
                    child: Slider(
                      value: state.bpm.toDouble(),
                      min: MetronomeConstants.minBPM.toDouble(),
                      max: MetronomeConstants.maxBPM.toDouble(),
                      activeColor: AppColors.primary,
                      inactiveColor: AppColors.backgroundGray,
                      onChanged: (value) {
                        notifier.setBpm(value.round());
                      },
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 32),
                    color: AppColors.textGray,
                    onPressed: () {
                      if (state.bpm < MetronomeConstants.maxBPM) {
                        notifier.setBpm(state.bpm + MetronomeConstants.bpmStep);
                      }
                    },
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // プリセットBPM
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: MetronomeConstants.presetBPMs.map((bpm) {
                  final isSelected = state.bpm == bpm;
                  return InkWell(
                    onTap: () => notifier.setBpm(bpm),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.backgroundLightDark,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$bpm',
                        style: TextStyle(
                          color: isSelected
                              ? AppColors.textWhite
                              : AppColors.textGray,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 30),

              // 拍子選択とアクセント
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // 拍子選択
                  Row(
                    children: [
                      const Text(
                        '拍子: ',
                        style: TextStyle(
                          color: AppColors.textGray,
                          fontSize: 14,
                        ),
                      ),
                      ...(MetronomeConstants.availableBeats.map((beats) {
                        final isSelected = state.beatsPerMeasure == beats;
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: InkWell(
                            onTap: () => notifier.setBeatsPerMeasure(beats),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.backgroundLightDark,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '$beats/4',
                                style: TextStyle(
                                  color: isSelected
                                      ? AppColors.textWhite
                                      : AppColors.textGray,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        );
                      })),
                    ],
                  ),

                  // アクセント切り替え
                  InkWell(
                    onTap: () => notifier.toggleAccent(),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: state.accentEnabled
                            ? AppColors.secondary.withOpacity(0.2)
                            : AppColors.backgroundLightDark,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: state.accentEnabled
                              ? AppColors.secondary
                              : AppColors.textGray,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.music_note,
                            color: state.accentEnabled
                                ? AppColors.secondary
                                : AppColors.textGray,
                            size: 18,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'アクセント',
                            style: TextStyle(
                              color: state.accentEnabled
                                  ? AppColors.secondary
                                  : AppColors.textGray,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
