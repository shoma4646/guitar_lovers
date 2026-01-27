import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../../shared/constants/app_colors.dart';
import '../../../features/metronome/application/metronome_provider.dart';

/// メトロノーム画面
class MetronomeScreen extends ConsumerStatefulWidget {
  const MetronomeScreen({super.key});

  @override
  ConsumerState<MetronomeScreen> createState() => _MetronomeScreenState();
}

class _MetronomeScreenState extends ConsumerState<MetronomeScreen>
    with SingleTickerProviderStateMixin {
  Timer? _timer;
  bool _isBeating = false;
  late AnimationController _animationController;

  /// オーディオプレーヤー
  final AudioPlayer _clickPlayer = AudioPlayer();
  final AudioPlayer _accentPlayer = AudioPlayer();

  /// オーディオ初期化完了フラグ
  bool _isAudioReady = false;

  /// 現在のビート位置
  int _currentBeat = 0;

  /// 利用可能な拍子
  static const List<int> _availableBeats = [2, 3, 4, 6];

  /// プリセットBPM
  static const List<int> _presetBPMs = [60, 80, 100, 120, 140, 160];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _initAudioPlayers();
  }

  Future<void> _initAudioPlayers() async {
    try {
      await _clickPlayer.setSource(AssetSource('audio/metronome_click.wav'));
      await _accentPlayer.setSource(AssetSource('audio/metronome_accent.wav'));
      await _clickPlayer.setReleaseMode(ReleaseMode.stop);
      await _accentPlayer.setReleaseMode(ReleaseMode.stop);
      _isAudioReady = true;
    } catch (e) {
      debugPrint('Failed to initialize audio players: $e');
    }
  }

  void _startMetronome(int bpm) {
    _stopMetronome();
    _currentBeat = 0;
    final interval = Duration(milliseconds: (60000 / bpm).round());
    _timer = Timer.periodic(interval, (_) {
      _beat();
    });
  }

  void _stopMetronome() {
    _timer?.cancel();
    _timer = null;
    _currentBeat = 0;
    setState(() {
      _isBeating = false;
    });
  }

  void _beat() {
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

    // 音を再生
    if (_isAudioReady) {
      _playSound(state.accentEnabled && _currentBeat == 0);
    }

    // 触覚フィードバック
    HapticFeedback.lightImpact();

    // ビート位置を更新
    _currentBeat = (_currentBeat + 1) % state.beatsPerMeasure;
  }

  void _playSound(bool isAccent) {
    try {
      if (isAccent) {
        _accentPlayer.stop().then((_) => _accentPlayer.resume());
      } else {
        _clickPlayer.stop().then((_) => _clickPlayer.resume());
      }
    } catch (e) {
      debugPrint('Metronome audio error: $e');
    }
  }

  @override
  void dispose() {
    _stopMetronome();
    _animationController.dispose();
    _clickPlayer.dispose();
    _accentPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(metronomeProvider);
    final notifier = ref.read(metronomeProvider.notifier);

    // 状態変更時にメトロノームを制御
    ref.listen<MetronomeState>(metronomeProvider, (previous, next) {
      if (previous?.isEnabled != next.isEnabled) {
        if (next.isEnabled) {
          _startMetronome(next.bpm);
        } else {
          _stopMetronome();
        }
      } else if (next.isEnabled && previous?.bpm != next.bpm) {
        _startMetronome(next.bpm);
      } else if (next.isEnabled && previous?.beatsPerMeasure != next.beatsPerMeasure) {
        _currentBeat = 0;
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Spacer(),
              
              // メインBPM表示
              GestureDetector(
                onTap: () => notifier.toggle(),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 100),
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isBeating
                        ? AppColors.primary
                        : AppColors.backgroundLightDark,
                    border: Border.all(
                      color: state.isEnabled
                          ? AppColors.primary
                          : AppColors.textGray,
                      width: 4,
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
                  final isActive = state.isEnabled && _currentBeat == index;
                  final isAccent = index == 0 && state.accentEnabled;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 100),
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    width: isAccent ? 20 : 16,
                    height: isAccent ? 20 : 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isActive
                          ? (isAccent ? AppColors.secondary : AppColors.primary)
                          : AppColors.backgroundLightDark,
                      border: Border.all(
                        color: isAccent ? AppColors.secondary : AppColors.primary,
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
                      if (state.bpm > MetronomeNotifier.minBPM) {
                        notifier.setBpm(state.bpm - 5);
                      }
                    },
                  ),
                  Expanded(
                    child: Slider(
                      value: state.bpm.toDouble(),
                      min: MetronomeNotifier.minBPM.toDouble(),
                      max: MetronomeNotifier.maxBPM.toDouble(),
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
                      if (state.bpm < MetronomeNotifier.maxBPM) {
                        notifier.setBpm(state.bpm + 5);
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
                children: _presetBPMs.map((bpm) {
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
                      ...(_availableBeats.map((beats) {
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
