import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../shared/constants/app_colors.dart';

/// メトロノームウィジェット
class MetronomeWidget extends StatefulWidget {
  final int bpm;
  final bool isEnabled;
  final ValueChanged<int> onBpmChanged;
  final VoidCallback onToggle;

  const MetronomeWidget({
    super.key,
    required this.bpm,
    required this.isEnabled,
    required this.onBpmChanged,
    required this.onToggle,
  });

  @override
  State<MetronomeWidget> createState() => _MetronomeWidgetState();
}

class _MetronomeWidgetState extends State<MetronomeWidget>
    with SingleTickerProviderStateMixin {
  Timer? _timer;
  bool _isBeating = false;
  late AnimationController _animationController;

  /// オーディオプレーヤー（クリック音用）
  final AudioPlayer _clickPlayer = AudioPlayer();

  /// オーディオプレーヤー（アクセント音用）
  final AudioPlayer _accentPlayer = AudioPlayer();

  /// 現在のビート位置（0-3）
  int _currentBeat = 0;

  /// 拍子（デフォルト4拍子）
  int _beatsPerMeasure = 4;

  /// アクセント（1拍目を強調するか）
  bool _accentEnabled = true;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _initAudioPlayers();
    if (widget.isEnabled) {
      _startMetronome();
    }
  }

  /// オーディオプレーヤーの初期化
  Future<void> _initAudioPlayers() async {
    // ソースをプリロード
    await _clickPlayer.setSource(AssetSource('audio/metronome_click.wav'));
    await _accentPlayer.setSource(AssetSource('audio/metronome_accent.wav'));

    // リリースモードを設定（再生後もソースを保持）
    await _clickPlayer.setReleaseMode(ReleaseMode.stop);
    await _accentPlayer.setReleaseMode(ReleaseMode.stop);
  }

  @override
  void didUpdateWidget(MetronomeWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.isEnabled != oldWidget.isEnabled) {
      if (widget.isEnabled) {
        _startMetronome();
      } else {
        _stopMetronome();
      }
    } else if (widget.isEnabled && widget.bpm != oldWidget.bpm) {
      _restartMetronome();
    }
  }

  void _startMetronome() {
    _stopMetronome();
    _currentBeat = 0;
    final interval = Duration(milliseconds: (60000 / widget.bpm).round());
    _timer = Timer.periodic(interval, (_) {
      _beat();
    });
  }

  void _stopMetronome() {
    _timer?.cancel();
    _timer = null;
    _currentBeat = 0;
  }

  void _restartMetronome() {
    _startMetronome();
  }

  Future<void> _beat() async {
    setState(() {
      _isBeating = true;
    });

    _animationController.forward().then((_) {
      _animationController.reverse();
      setState(() {
        _isBeating = false;
      });
    });

    // 音を再生
    try {
      if (_accentEnabled && _currentBeat == 0) {
        // 1拍目はアクセント音
        await _accentPlayer.stop();
        await _accentPlayer.resume();
      } else {
        // 通常のクリック音
        await _clickPlayer.stop();
        await _clickPlayer.resume();
      }
    } catch (e) {
      // 音声再生エラーは無視（触覚フィードバックのみ）
      debugPrint('Metronome audio error: $e');
    }

    // 触覚フィードバック
    HapticFeedback.lightImpact();

    // ビート位置を更新
    _currentBeat = (_currentBeat + 1) % _beatsPerMeasure;
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
    return Container(
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
              const Text(
                'メトロノーム',
                style: TextStyle(
                  color: AppColors.textWhite,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Row(
                children: [
                  // アクセント切り替えボタン
                  IconButton(
                    icon: Icon(
                      Icons.music_note,
                      color: _accentEnabled
                          ? AppColors.primary
                          : AppColors.textGray,
                      size: 20,
                    ),
                    onPressed: () {
                      setState(() {
                        _accentEnabled = !_accentEnabled;
                      });
                    },
                    tooltip: 'アクセント',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  Switch(
                    value: widget.isEnabled,
                    onChanged: (_) => widget.onToggle(),
                    activeTrackColor: AppColors.primary,
                    activeThumbColor: AppColors.textWhite,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),

          // ビートインジケーター
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_beatsPerMeasure, (index) {
              final isActive = widget.isEnabled && _currentBeat == index;
              final isAccent = index == 0 && _accentEnabled;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: isAccent ? 14 : 10,
                height: isAccent ? 14 : 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isActive
                      ? (isAccent ? AppColors.secondary : AppColors.primary)
                      : AppColors.backgroundLightDark,
                  border: Border.all(
                    color: isAccent ? AppColors.secondary : AppColors.primary,
                    width: 1,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.remove),
                color: AppColors.textGray,
                onPressed: () {
                  if (widget.bpm > 40) {
                    widget.onBpmChanged(widget.bpm - 5);
                  }
                },
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 100),
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _isBeating
                      ? AppColors.primary
                      : AppColors.backgroundLightDark,
                  border: Border.all(
                    color: widget.isEnabled
                        ? AppColors.primary
                        : AppColors.textGray,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Text(
                    '${widget.bpm}',
                    style: const TextStyle(
                      color: AppColors.textWhite,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.add),
                color: AppColors.textGray,
                onPressed: () {
                  if (widget.bpm < 240) {
                    widget.onBpmChanged(widget.bpm + 5);
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 8),

          // 拍子選択
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                '拍子: ',
                style: TextStyle(
                  color: AppColors.textGray,
                  fontSize: 12,
                ),
              ),
              ...([2, 3, 4, 6].map((beats) {
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _beatsPerMeasure = beats;
                      _currentBeat = 0;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _beatsPerMeasure == beats
                          ? AppColors.primary
                          : AppColors.backgroundLightDark,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '$beats/4',
                      style: TextStyle(
                        color: _beatsPerMeasure == beats
                            ? AppColors.textWhite
                            : AppColors.textGray,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              })),
            ],
          ),
          const SizedBox(height: 8),

          // プリセットBPM
          Wrap(
            spacing: 8,
            children: [60, 80, 100, 120, 140, 160].map((bpm) {
              return GestureDetector(
                onTap: () => widget.onBpmChanged(bpm),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: widget.bpm == bpm
                        ? AppColors.primary
                        : AppColors.backgroundLightDark,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$bpm',
                    style: TextStyle(
                      color: widget.bpm == bpm
                          ? AppColors.textWhite
                          : AppColors.textGray,
                      fontSize: 12,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
