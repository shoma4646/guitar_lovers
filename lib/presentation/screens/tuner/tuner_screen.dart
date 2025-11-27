import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/constants/app_colors.dart';
import '../../../features/tuner/domain/tuning.dart';
import '../../../features/tuner/application/pitch_detector_provider.dart';
import '../../../features/tuner/domain/pitch_data.dart';

/// チューナー画面
class TunerScreen extends ConsumerStatefulWidget {
  const TunerScreen({super.key});

  @override
  ConsumerState<TunerScreen> createState() => _TunerScreenState();
}

class _TunerScreenState extends ConsumerState<TunerScreen> {
  String _selectedTuning = 'Standard';
  String? _errorMessage;
  String _lastStableNote = '';
  int _lastStableString = 0;
  int _emptyCount = 0;
  double _smoothedCents = 0.0;

  /// EMAスムージング係数 (0.0-1.0: 値が小さいほどスムーズだが反応が遅い)
  static const double _emaAlpha = 0.15;

  /// セント差がこの値を超えたらスムージングをリセット (新しい音符と判断)
  static const double _centsResetThreshold = 50.0;

  int _lastDetectedString = 0;
  int _sameStringCount = 0;

  /// 減衰時に音名を非表示にするまでの閾値（空データのカウント数）
  /// 約8回 = 0.6秒程度の保持時間
  static const int _emptyThreshold = 8;

  /// 各弦のチューニング完了状態を管理
  final Map<int, bool> _stringTuned = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  };

  /// 各弦がチューニング範囲内にいる時間をカウント
  final Map<int, int> _stringInTuneCount = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  /// チューニング完了とみなすための継続カウント数（約0.5秒 = 6カウント）
  static const int _tuneCompleteThreshold = 6;

  Future<void> _toggleListening() async {
    final service = ref.read(pitchDetectorServiceProvider);
    // 現在の検出状態を取得
    final isDetecting = ref.read(isDetectingProvider);

    try {
      if (isDetecting) {
        // 検出中にトグルされた場合
        await service.stop();
        ref.read(isDetectingProvider.notifier).toggle(false);
        setState(() {
          _errorMessage = null;
        });
      } else {
        // 検出されていない場合にトグルされた場合
        // 開始時にチューニング状態をリセット
        _resetAllTuning();
        await service.start();
        ref.read(isDetectingProvider.notifier).toggle(true);
        setState(() {
          _errorMessage = null;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
      ref.read(isDetectingProvider.notifier).toggle(false);
    }
  }

  Color _getMeterColor(double cents) {
    final absCents = cents.abs();
    if (absCents < 10) {
      // チューニング完了範囲（緑 -> Primary）
      return AppColors.primary;
    } else if (cents > 0) {
      // 高い（赤 -> Error）
      return AppColors.error;
    } else {
      // 低い（青 -> Secondary）
      return AppColors.secondary;
    }
  }

  String _getStringName(int stringNum) {
    if (stringNum == 0) return '';

    const stringNames = {
      6: 'E',
      5: 'A',
      4: 'D',
      3: 'G',
      2: 'B',
      1: 'E',
    };

    return '$stringNum弦 (${stringNames[stringNum]})';
  }

  double _smoothCents(double currentCents) {
    // セント差が大きい場合（新しい音符）、スムージングをリセット
    if ((currentCents - _smoothedCents).abs() > _centsResetThreshold) {
      _smoothedCents = currentCents;
    } else {
      _smoothedCents =
          _emaAlpha * currentCents + (1 - _emaAlpha) * _smoothedCents;
    }
    return _smoothedCents;
  }

  /// チューニング状態を更新
  void _updateTuningStatus(int stringNum, bool isInTune, double probability) {
    if (stringNum == 0) return;

    setState(() {
      if (isInTune) {
        // 強い音（確率0.3以上）の場合は重みを2倍にして早く完了判定
        final weight = probability > 0.3 ? 2 : 1;
        _stringInTuneCount[stringNum] =
            (_stringInTuneCount[stringNum] ?? 0) + weight;

        // 閾値を超えたらチューニング完了とみなす
        if ((_stringInTuneCount[stringNum] ?? 0) >= _tuneCompleteThreshold) {
          _stringTuned[stringNum] = true;
        }
      } else {
        // チューニング範囲外の場合
        // すでに完了している場合は、大きく外れた時のみリセット
        if (_stringTuned[stringNum] == true) {
          // 完了済みの弦が大きく外れた場合のみリセット（再調整が必要）
          // 確率が高く、20セント以上外れている場合
          if (probability > 0.3) {
            _stringInTuneCount[stringNum] = 0;
            _stringTuned[stringNum] = false;
          }
        } else {
          // 未完了の場合は通常通りリセット
          _stringInTuneCount[stringNum] = 0;
        }
      }
    });
  }

  /// 全弦のチューニングをリセット
  void _resetAllTuning() {
    setState(() {
      _stringTuned.updateAll((key, value) => false);
      _stringInTuneCount.updateAll((key, value) => 0);
    });
  }

  /// 全弦のチューニング状態を表示
  Widget _buildAllStringsDisplay(PitchData? pitchData) {
    // 標準チューニングの音名
    const stringNotes = {
      6: 'E',
      5: 'A',
      4: 'D',
      3: 'G',
      2: 'B',
      1: 'E',
    };

    final currentString = pitchData?.guitarString ?? 0;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.backgroundGray,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [6, 5, 4, 3, 2, 1].map((stringNum) {
          final isCurrent = currentString == stringNum;
          final isTuned = _stringTuned[stringNum] ?? false;
          final note = stringNotes[stringNum] ?? '';

          return _buildStringIndicator(
            stringNum: stringNum,
            note: note,
            isCurrent: isCurrent,
            isTuned: isTuned,
          );
        }).toList(),
      ),
    );
  }

  /// 各弦のインジケーター
  Widget _buildStringIndicator({
    required int stringNum,
    required String note,
    required bool isCurrent,
    required bool isTuned,
  }) {
    // Color backgroundColor; // Removed unused variable
    Color textColor;
    double scale = 1.0;

    if (isTuned) {
      // チューニング完了（緑色）
      textColor = AppColors.textWhite;
      scale = 1.1;
    } else if (isCurrent) {
      // 現在チューニング中（黄色）
      textColor = AppColors.backgroundDark;
      scale = 1.15;
    } else {
      // 未チューニング（グレー）
      textColor = AppColors.textGray;
    }

    return AnimatedScale(
      scale: scale,
      duration: const Duration(milliseconds: 200),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        width: 48,
        height: 64,
        decoration: BoxDecoration(
          color: isTuned
              ? AppColors.primary.withOpacity(0.8)
              : (isCurrent
                  ? AppColors.secondary.withOpacity(0.2)
                  : AppColors.glassSurface),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isCurrent ? AppColors.secondary : AppColors.glassBorder,
            width: isCurrent ? 2 : 1,
          ),
          boxShadow: isTuned
              ? [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.5),
                    blurRadius: 12,
                    spreadRadius: 2,
                  ),
                ]
              : (isCurrent
                  ? [
                      BoxShadow(
                        color: AppColors.secondary.withOpacity(0.3),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ]
                  : null),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '$stringNum弦',
              style: TextStyle(
                color: textColor,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              note,
              style: TextStyle(
                color: textColor,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDetecting = ref.watch(isDetectingProvider);
    final pitchDataAsync = ref.watch(pitchDataStreamProvider);

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
                        color: isSelected
                            ? AppColors.textWhite
                            : AppColors.textGray,
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),

              // 全弦のチューニング状態表示
              _buildAllStringsDisplay(pitchDataAsync.value),
              const SizedBox(height: 20),

              // チューナーディスプレイ
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // エラーメッセージ
                      if (_errorMessage != null)
                        Container(
                          margin: const EdgeInsets.only(bottom: 20),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.error.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppColors.error,
                              width: 2,
                            ),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: AppColors.error,
                              fontSize: 14,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),

                      // ピッチデータの表示
                      pitchDataAsync.when(
                        data: (pitchData) => _buildTunerDisplay(pitchData),
                        loading: () => _buildTunerDisplay(PitchData.empty),
                        error: (error, stack) => _buildErrorDisplay(error),
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
                        isDetecting ? AppColors.error : AppColors.primary,
                  ),
                  child: Text(
                    isDetecting ? 'Stop' : 'Start Tuning',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 注意書き(権限に関する情報)
              if (!isDetecting)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundGray,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'チューナーを開始するには、マイクへのアクセス権限が必要です',
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

  Widget _buildTunerDisplay(PitchData pitchData) {
    // 減衰時のチラつき防止：空データが一定回数来るまで前回の音名と弦番号を保持
    String currentNote;
    int currentString;
    double cents;
    bool isActuallyDetecting; // 実際に音が検出されているか（保持期間中ではないか）

    if (pitchData.isPitched && pitchData.noteName.isNotEmpty) {
      // 音が検出された場合
      _emptyCount = 0;
      currentNote = pitchData.noteName;
      isActuallyDetecting = true;

      // 弦番号の判定：連続して3回同じ弦が検出された場合のみ更新
      if (pitchData.guitarString > 0) {
        if (_lastDetectedString == pitchData.guitarString) {
          _sameStringCount++;
          if (_sameStringCount >= 3) {
            // 3回連続で同じ弦が検出されたので確定
            _lastStableString = pitchData.guitarString;
          }
        } else {
          // 弦が変わったのでカウントリセット
          _lastDetectedString = pitchData.guitarString;
          _sameStringCount = 1;
        }
      }

      currentString = _lastStableString;
      _lastStableNote = pitchData.noteName;

      // セント値のスムージングで外れた値を抑制
      cents = _smoothCents(pitchData.cents);

      // チューニング状態の更新
      _updateTuningStatus(
          currentString, pitchData.isInTune, pitchData.probability);
    } else {
      _emptyCount++;
      if (_emptyCount >= _emptyThreshold) {
        // 閾値を超えたら完全にリセット
        currentNote = '';
        currentString = 0;
        _lastStableNote = '';
        _lastStableString = 0;
        _lastDetectedString = 0;
        _sameStringCount = 0;
        _smoothedCents = 0.0;
        cents = 0;
        isActuallyDetecting = false;

        // すべての弦のカウントをリセット
        _stringInTuneCount.updateAll((key, value) => 0);
      } else {
        // 保持期間中（減衰中）
        currentNote = _lastStableNote;
        currentString = _lastStableString;
        cents = _smoothedCents;
        isActuallyDetecting = false; // 保持期間中はセント数を非表示にする
      }
    }

    return Column(
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
            currentNote.isEmpty ? '-' : currentNote,
            key: ValueKey(currentNote),
            style: Theme.of(context).textTheme.displayLarge,
          ),
        ),
        const SizedBox(height: 10),

        // 弦の情報表示
        if (currentString > 0)
          AnimatedOpacity(
            opacity: currentString > 0 ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 150),
            child: Text(
              _getStringName(currentString),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.textGray,
                  ),
            ),
          ),
        const SizedBox(height: 30),

        // ビジュアルメーター
        Column(
          children: [
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
                  // 中央のマーカー（緑）
                  Container(
                    width: 2,
                    height: 40,
                    color: AppColors.primary,
                  ),
                  // 左右の目盛り
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // 左（低い）- 青
                      Container(
                        width: 2,
                        height: 20,
                        color: Colors.blue,
                      ),
                      // 右（高い）- 赤
                      Container(
                        width: 2,
                        height: 20,
                        color: AppColors.error,
                      ),
                    ],
                  ),
                  // インジケーター（実際に検出中のみ表示）
                  if (currentNote.isNotEmpty && isActuallyDetecting)
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: cents),
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
                              color: _getMeterColor(value),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
            // ラベル（低い・高い）
            if (isActuallyDetecting)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '低い',
                      style: TextStyle(
                        color: Colors.blue,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '高い',
                      style: TextStyle(
                        color: AppColors.error,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 20),

        // セント表示（実際に検出中のみ表示）
        if (isActuallyDetecting)
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 150),
            style: Theme.of(context).textTheme.headlineMedium!.copyWith(
                  color: _getMeterColor(cents),
                ),
            child: Text(
              currentNote.isEmpty
                  ? '0.0 cents'
                  : '${cents.toStringAsFixed(1)} cents',
            ),
          ),
      ],
    );
  }

  Widget _buildErrorDisplay(Object error) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline,
            color: AppColors.error,
            size: 48,
          ),
          const SizedBox(height: 12),
          Text(
            'エラーが発生しました',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppColors.error,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            style: const TextStyle(
              color: AppColors.textGray,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
