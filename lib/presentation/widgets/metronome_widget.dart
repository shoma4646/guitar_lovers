import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    if (widget.isEnabled) {
      _startMetronome();
    }
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
    final interval = Duration(milliseconds: (60000 / widget.bpm).round());
    _timer = Timer.periodic(interval, (_) {
      _beat();
    });
  }

  void _stopMetronome() {
    _timer?.cancel();
    _timer = null;
  }

  void _restartMetronome() {
    _startMetronome();
  }

  void _beat() {
    setState(() {
      _isBeating = true;
    });
    _animationController.forward().then((_) {
      _animationController.reverse();
      setState(() {
        _isBeating = false;
      });
    });
    // 触覚フィードバック
    HapticFeedback.lightImpact();
  }

  @override
  void dispose() {
    _stopMetronome();
    _animationController.dispose();
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
              Switch(
                value: widget.isEnabled,
                onChanged: (_) => widget.onToggle(),
                activeColor: AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 8),
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
                    style: TextStyle(
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
