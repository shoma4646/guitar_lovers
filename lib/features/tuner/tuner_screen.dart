import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math';
import '../../shared/constants/app_colors.dart';
import '../../models/tuning.dart';

/// チューナー画面
class TunerScreen extends StatefulWidget {
  const TunerScreen({super.key});

  @override
  State<TunerScreen> createState() => _TunerScreenState();
}

class _TunerScreenState extends State<TunerScreen> {
  bool _isListening = false;
  String _currentNote = '';
  double _cents = 0.0;
  String _selectedTuning = 'Standard';
  Timer? _mockTimer;

  @override
  void dispose() {
    _mockTimer?.cancel();
    super.dispose();
  }

  void _toggleListening() {
    setState(() {
      _isListening = !_isListening;
    });

    if (_isListening) {
      _startMockDetection();
    } else {
      _stopMockDetection();
    }
  }

  // モック音声検出(実際の実装では音声入力を使用)
  void _startMockDetection() {
    final random = Random();

    _mockTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (!_isListening) {
        timer.cancel();
        return;
      }

      // 選択されたチューニングの音を使用
      final selectedTuning = Tuning.presets.firstWhere(
        (t) => t.name == _selectedTuning,
        orElse: () => Tuning.presets.first,
      );

      if (mounted) {
        setState(() {
          // ランダムに音名を選択
          _currentNote = selectedTuning.notes[random.nextInt(selectedTuning.notes.length)];
          // -50から+50セントの範囲でランダムな値を生成
          _cents = (random.nextDouble() * 100) - 50;
        });
      }
    });
  }

  void _stopMockDetection() {
    _mockTimer?.cancel();
    setState(() {
      _currentNote = '';
      _cents = 0.0;
    });
  }

  Color _getMeterColor() {
    final absCents = _cents.abs();
    if (absCents < 10) return AppColors.primary;
    if (absCents < 25) return Colors.yellow;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // チューニングプリセットセレクター
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Wrap(
                  key: ValueKey(_selectedTuning),
                  spacing: 10,
                  alignment: WrapAlignment.center,
                  children: Tuning.presets.map((tuning) {
                    final isSelected = _selectedTuning == tuning.name;
                    return ChoiceChip(
                      label: Text(tuning.name),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected && _selectedTuning != tuning.name) {
                          setState(() {
                            _selectedTuning = tuning.name;
                          });
                        }
                      },
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.backgroundGray,
                      labelStyle: TextStyle(
                        color: isSelected ? AppColors.textWhite : AppColors.textGray,
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 30),

              // チューナーディスプレイ
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                    // 音名表示
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 150),
                      transitionBuilder: (child, animation) {
                        return FadeTransition(
                          opacity: animation,
                          child: child,
                        );
                      },
                      child: Text(
                        _currentNote.isEmpty ? '-' : _currentNote,
                        key: ValueKey(_currentNote),
                        style: Theme.of(context).textTheme.displayLarge,
                      ),
                    ),
                    const SizedBox(height: 40),

                    // ビジュアルメーター
                    Container(
                      height: 100,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // 背景のメーター
                          Container(
                            width: double.infinity,
                            height: 4,
                            decoration: BoxDecoration(
                              color: AppColors.backgroundGray,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          // 中央のマーカー
                          Container(
                            width: 2,
                            height: 40,
                            color: AppColors.textGray,
                          ),
                          // 左右の目盛り
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                width: 2,
                                height: 20,
                                color: AppColors.textGray,
                              ),
                              Container(
                                width: 2,
                                height: 20,
                                color: AppColors.textGray,
                              ),
                            ],
                          ),
                          // インジケーター
                          if (_currentNote.isNotEmpty)
                            TweenAnimationBuilder<double>(
                              tween: Tween(begin: 0, end: _cents),
                              duration: const Duration(milliseconds: 100),
                              curve: Curves.easeOut,
                              builder: (context, value, child) {
                                return Transform.translate(
                                  offset: Offset(value * 1.5, 0),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 150),
                                    width: 8,
                                    height: 50,
                                    decoration: BoxDecoration(
                                      color: _getMeterColor(),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // セント表示
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 150),
                      style: Theme.of(context).textTheme.headlineMedium!.copyWith(
                            color: _getMeterColor(),
                          ),
                      child: Text(
                        _currentNote.isEmpty
                            ? '0.0 cents'
                            : '${_cents.toStringAsFixed(1)} cents',
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 精度インジケーター
                    AnimatedOpacity(
                      opacity: _currentNote.isNotEmpty ? 1.0 : 0.0,
                      duration: const Duration(milliseconds: 200),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: _getMeterColor().withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _getMeterColor(),
                            width: 2,
                          ),
                        ),
                        child: Text(
                          _cents.abs() < 10 ? 'チューニング完了' : 'チューニング中',
                          style: TextStyle(
                            color: _getMeterColor(),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                ),
              ),

              // 開始/停止ボタン
              SizedBox(
                width: double.infinity,
                height: 60,
                child: ElevatedButton(
                  onPressed: _toggleListening,
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        _isListening ? AppColors.error : AppColors.primary,
                  ),
                  child: Text(
                    _isListening ? 'Stop' : 'Start Tuning',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 注意書き
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.backgroundGray,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'デモモード: ランダムな音程を表示しています\n実際の実装では、マイク入力から音程を検出します',
                  style: TextStyle(
                    color: AppColors.textGray,
                    fontSize: 12,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
