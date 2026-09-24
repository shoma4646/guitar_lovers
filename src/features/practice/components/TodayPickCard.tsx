/**
 * 今日の1本カード
 *
 * 練習タブの主役。今日の練習メニューの先頭（今日の1本）を大きく見せ、
 * 前回BPM → 今日の目標BPMと進捗バー、開始ボタンをまとめる。
 */

import { View, Text, ActivityIndicator } from "react-native";
import { Card } from "@/shared/components/molecules/Card";
import { Button } from "@/shared/components/atoms/Button";
import { ProgressBar } from "@/shared/components/atoms/ProgressBar";
import { colors, radius } from "@/shared/theme";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import {
  buildTodayMenu,
  pickTodayPick,
  type TodayMenuPriority,
} from "@/features/practice/lib/progression";
import { resolveTodayProgress } from "@/features/practice/lib/todayCompletion";
import { summarizePhraseProgress } from "@/features/progress/lib/phraseProgress";
import { formatDuration } from "@/features/practice/lib/formatters";
import type { PracticePhrase } from "@/shared/types/models";

const TODAY_PICK_REASONS: Record<Exclude<TodayMenuPriority, "graduated">, string> = {
  retry: "前回はうまくいかなかったので、無理のないテンポでもう一度",
  stale: "前回は弾けたフレーズ",
  fresh: "まだ記録がありません",
};

type Props = {
  onStartPhrase: (phrase: PracticePhrase, todayTargetBpm: number) => void;
  /** 空状態でサンプル動画から練習を試すためのコールバック */
  onTryPreset: () => void;
};

export function TodayPickCard({ onStartPhrase, onTryPreset }: Props) {
  const { data: phrases, isLoading: isLoadingPhrases } = usePracticePhrases();
  const { data: attempts, isLoading: isLoadingAttempts } = usePhraseAttempts();
  const isLoading = isLoadingPhrases || isLoadingAttempts;

  if (isLoading) {
    return (
      <Card style={{ height: 96, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  const menuItems = buildTodayMenu(phrases ?? [], attempts ?? []);
  const todayPick = pickTodayPick(menuItems);

  if (!todayPick) {
    return (
      <Card style={{ gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onSurface }}>
          {menuItems.length === 0
            ? "今日の1本を見つけよう"
            : "今日の1本は全て目標BPMに到達しました"}
        </Text>
        <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
          {menuItems.length === 0
            ? "動画を読み込み、A点・B点を決めてフレーズとして保存すると、ここに表示されます"
            : "新しいフレーズを追加すると、また今日の1本が選ばれます"}
        </Text>
        {menuItems.length === 0 && (
          <Button label="サンプル動画で試す" onPress={onTryPreset} variant="tonal" size="sm" />
        )}
      </Card>
    );
  }

  const { phrase, priority } = todayPick;
  const phraseAttempts = (attempts ?? []).filter((a) => a.phraseId === phrase.id);
  // 目標は他の導線と同じく当日の記録を除いて求める。buildTodayMenuの値は当日の結果を
  // 含むため、同じフレーズでも入口によって目標BPMが変わってしまう
  const { targetBeforeToday: todayTargetBpm } = resolveTodayProgress(
    phrase,
    phraseAttempts,
    new Date(),
  );
  const progress = summarizePhraseProgress(phrase, phraseAttempts);
  const bpmToGoal = Math.max(0, phrase.targetBpm - todayTargetBpm);
  // pickTodayPickはgraduatedを選ばないため、ここでのpriorityは必ずTODAY_PICK_REASONSに存在する
  const reason = `${TODAY_PICK_REASONS[priority as Exclude<TodayMenuPriority, "graduated">]}。目標まであと${bpmToGoal}BPM`;

  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radius.pill,
            backgroundColor: colors.primaryFixed,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "800", color: colors.onPrimaryFixedVariant }}>
            今日の1本
          </Text>
        </View>
        <Text style={{ flex: 1, fontSize: 12, color: colors.onSurfaceVariant }} numberOfLines={1}>
          {reason}
        </Text>
      </View>

      <View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.onSurface }} numberOfLines={1}>
          {phrase.name}
        </Text>
        <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }} numberOfLines={1}>
          {phrase.videoTitle} ・ {formatDuration(phrase.startSec)}-{formatDuration(phrase.endSec)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>前回</Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: colors.onSurface,
              fontVariant: ["tabular-nums"],
            }}
          >
            {progress.currentBpm}
          </Text>
        </View>
        <Text style={{ fontSize: 18, color: colors.onSurfaceVariant }}>→</Text>
        <View>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>今日の目標</Text>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: colors.primary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {todayTargetBpm} BPM
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>
              開始 {progress.startBpm}
            </Text>
            <Text style={{ fontSize: 10, color: colors.onSurfaceVariant }}>
              卒業 {progress.targetBpm}
            </Text>
          </View>
          <ProgressBar
            ratio={progress.progressRatio}
            accessibilityLabel={`${phrase.name}の進捗、開始${progress.startBpm}から目標${progress.targetBpm}のうち現在${progress.currentBpm}`}
          />
        </View>
      </View>

      <Button
        label="この1本から始める"
        onPress={() => onStartPhrase(phrase, todayTargetBpm)}
        variant="primary"
        size="lg"
        icon="play_arrow"
        fullWidth
      />
    </Card>
  );
}
