import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import '../../shared/constants/app_colors.dart';
import 'providers/practice_history_provider.dart';

/// 練習記録画面
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(practiceStatsProvider);
    final sessionsAsync = ref.watch(practiceSessionsProvider);
    final weeklyDataAsync = ref.watch(weeklyDataProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(practiceStatsProvider);
          ref.invalidate(practiceSessionsProvider);
          ref.invalidate(weeklyDataProvider);
        },
        child: CustomScrollView(
          slivers: [
            // 統計情報ヘッダー
            SliverToBoxAdapter(
              child: statsAsync.when(
                data: (stats) => _StatsSummary(stats: stats),
                loading: () => const _StatsSummaryLoading(),
                error: (_, __) => const SizedBox.shrink(),
              ),
            ),

            // 週次グラフ
            SliverToBoxAdapter(
              child: weeklyDataAsync.when(
                data: (data) => _WeeklyChart(data: data),
                loading: () => const _WeeklyChartLoading(),
                error: (_, __) => const SizedBox.shrink(),
              ),
            ),

            // セクションヘッダー
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                  '練習履歴',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textWhite,
                  ),
                ),
              ),
            ),

            // 練習履歴リスト
            sessionsAsync.when(
              data: (sessions) {
                if (sessions.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Text(
                        '練習記録がありません\n右下の + ボタンから記録を追加してください',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.textGray,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  );
                }

                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final session = sessions[index];
                      return Dismissible(
                        key: Key(session.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          color: AppColors.error,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          child: const Icon(
                            Icons.delete,
                            color: AppColors.textWhite,
                          ),
                        ),
                        onDismissed: (_) {
                          ref
                              .read(practiceSessionsProvider.notifier)
                              .deleteSession(session.id);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('練習記録を削除しました')),
                          );
                        },
                        child: _SessionCard(session: session),
                      );
                    },
                    childCount: sessions.length,
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (_, __) => const SliverFillRemaining(
                child: Center(child: Text('エラーが発生しました')),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddDialog(context, ref),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add),
      ),
    );
  }

  /// 練習記録追加ダイアログ
  void _showAddDialog(BuildContext context, WidgetRef ref) {
    final durationController = TextEditingController();
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.backgroundLightDark,
        title: const Text(
          '練習記録を追加',
          style: TextStyle(color: AppColors.textWhite),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: durationController,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: AppColors.textWhite),
              decoration: const InputDecoration(
                labelText: '練習時間（分）',
                labelStyle: TextStyle(color: AppColors.textGray),
                hintText: '30',
                hintStyle: TextStyle(color: AppColors.textGray),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppColors.textGray),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              style: const TextStyle(color: AppColors.textWhite),
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: '練習内容（任意）',
                labelStyle: TextStyle(color: AppColors.textGray),
                hintText: '例：スケール練習、コード進行',
                hintStyle: TextStyle(color: AppColors.textGray),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppColors.textGray),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppColors.primary),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'キャンセル',
              style: TextStyle(color: AppColors.textGray),
            ),
          ),
          TextButton(
            onPressed: () async {
              final durationText = durationController.text.trim();
              if (durationText.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('練習時間を入力してください')),
                );
                return;
              }

              final duration = int.tryParse(durationText);
              if (duration == null || duration <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('有効な数値を入力してください')),
                );
                return;
              }

              final notes = notesController.text.trim().isEmpty
                  ? null
                  : notesController.text.trim();

              await ref.read(practiceSessionsProvider.notifier).addSession(
                    durationMinutes: duration,
                    notes: notes,
                  );

              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('練習記録を追加しました')),
                );
              }
            },
            child: const Text(
              '保存',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}

/// 統計サマリー
class _StatsSummary extends StatelessWidget {
  final dynamic stats;

  const _StatsSummary({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: '今週の練習',
                  value: stats.weeklyTimeFormatted,
                  icon: Icons.calendar_today,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  title: '連続日数',
                  value: '${stats.currentStreak}日',
                  icon: Icons.local_fire_department,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: '累計時間',
                  value: stats.totalTimeFormatted,
                  icon: Icons.schedule,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  title: '総回数',
                  value: '${stats.totalSessions}回',
                  icon: Icons.repeat,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              Share.share(
                '今週は${stats.weeklyTimeFormatted}ギターを練習しました！🎸\n'
                '累計: ${stats.totalTimeFormatted}\n'
                '#GuitarLovers',
              );
            },
            icon: const Icon(Icons.share),
            label: const Text('練習記録をシェア'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.textWhite,
            ),
          ),
        ],
      ),
    );
  }
}

/// 統計カード
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundLightDark,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textGray,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textWhite,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

/// 統計サマリーローディング
class _StatsSummaryLoading extends StatelessWidget {
  const _StatsSummaryLoading();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundLightDark,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundLightDark,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundLightDark,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundLightDark,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 週次グラフ
class _WeeklyChart extends StatelessWidget {
  final List<int> data;

  const _WeeklyChart({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '今週の練習時間',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textWhite,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: data.isEmpty
                    ? 60
                    : (data.reduce((a, b) => a > b ? a : b) + 10).toDouble(),
                barTouchData: BarTouchData(enabled: false),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        const days = ['月', '火', '水', '木', '金', '土', '日'];
                        if (value.toInt() < 0 || value.toInt() >= days.length) {
                          return const Text('');
                        }
                        return Text(
                          days[value.toInt()],
                          style: const TextStyle(
                            color: AppColors.textGray,
                            fontSize: 12,
                          ),
                        );
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                barGroups: List.generate(
                  7,
                  (index) => BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: index < data.length ? data[index].toDouble() : 0,
                        color: AppColors.primary,
                        width: 20,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(4),
                          topRight: Radius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 週次グラフローディング
class _WeeklyChartLoading extends StatelessWidget {
  const _WeeklyChartLoading();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      height: 250,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.backgroundLightDark,
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

/// セッションカード
class _SessionCard extends StatelessWidget {
  final dynamic session;

  const _SessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('yyyy年MM月dd日(E)', 'ja_JP');
    final timeFormat = DateFormat('HH:mm');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundLightDark,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                dateFormat.format(session.dateTime),
                style: const TextStyle(
                  color: AppColors.textWhite,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                timeFormat.format(session.dateTime),
                style: const TextStyle(
                  color: AppColors.textGray,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.schedule,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                '${session.durationMinutes}分',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          if (session.notes != null) ...[
            const SizedBox(height: 12),
            Text(
              session.notes!,
              style: const TextStyle(
                color: AppColors.textGray,
                fontSize: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
