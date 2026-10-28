/**
 * 今日の1本カード
 *
 * 練習タブの主役。今日の練習メニューの先頭（今日の1本）を大きく見せ、
 * 前回BPM → 今日の目標BPMと進捗バー、開始ボタンをまとめる。
 * フレーズが0本のときは、動画の追加からフレーズ保存までの流れを案内する「はじめに」カードになる。
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
import { summarizePhraseProgress } from "@/features/progress/lib/phraseProgress";
import { formatDuration } from "@/features/practice/lib/formatters";
import type { PracticePhrase } from "@/shared/types/models";

const FIRST_STEPS = ["YouTubeのURLを貼る", "A・Bで区間を囲んで保存", "翌日からワンタップで練習"];

const TODAY_PICK_REASONS: Record<Exclude<TodayMenuPriority, "graduated">, string> = {
  retry: "前回はうまくいかなかったので、無理のないテンポでもう一度",
  stale: "前回は弾けたフレーズ",
  fresh: "まだ記録がありません",
};

type Props = {
  onStartPhrase: (phrase: PracticePhrase, startBpm: number) => void;
  /** 空状態でサンプル動画から練習を試すためのコールバック */
  onTryPreset: () => void;
  /** 空状態の主ボタンから動画追加シートを開くためのコールバック */
  onOpenAddVideo: () => void;
};

export function TodayPickCard({ onStartPhrase, onTryPreset, onOpenAddVideo }: Props) {
  const phrasesQuery = usePracticePhrases();
  const attemptsQuery = usePhraseAttempts();
  const { data: phrases } = phrasesQuery;
  const { data: attempts } = attemptsQuery;
  const isLoading = phrasesQuery.isLoading || attemptsQuery.isLoading;

  if (isLoading) {
    return (
      <Card style={{ height: 96, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  if (phrases === undefined || attempts === undefined) {
    return (
      <ReadErrorCard
        onRetry={() => {
          void phrasesQuery.refetch();
          void attemptsQuery.refetch();
        }}
      />
    );
  }

  const menuItems = buildTodayMenu(phrases, attempts, new Date());
  const todayPick = pickTodayPick(menuItems);

  if (menuItems.length === 0) {
    return <FirstStepsCard onOpenAddVideo={onOpenAddVideo} onTryPreset={onTryPreset} />;
  }

  if (!todayPick) {
    return (
      <Card style={{ gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onSurface }}>
          今日の1本は全て目標BPMに到達しました
        </Text>
        <Text style={{ fontSize: 13, color: colors.onSurfaceVariant }}>
          新しいフレーズを追加すると、また今日の1本が選ばれます
        </Text>
      </Card>
    );
  }

  const { phrase, priority } = todayPick;
  const phraseAttempts = attempts.filter((a) => a.phraseId === phrase.id);
  const { targetBeforeToday } = todayPick.today;
  const progress = summarizePhraseProgress(phrase, phraseAttempts);
  const bpmToGoal = Math.max(0, phrase.targetBpm - targetBeforeToday);
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
            {targetBeforeToday} BPM
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
        onPress={() => onStartPhrase(phrase, targetBeforeToday)}
        variant="primary"
        size="lg"
        icon="play_arrow"
        fullWidth
      />
    </Card>
  );
}

function ReadErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onSurface }}>
          練習の記録を読み込めませんでした
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 18, color: colors.onSurfaceVariant }}>
          端末内の記録の読み出しに失敗しました。少し待ってから再読み込みしてください
        </Text>
      </View>
      <Button label="再読み込み" onPress={onRetry} variant="primary" size="lg" icon="refresh" fullWidth />
    </Card>
  );
}

type FirstStepsCardProps = {
  onOpenAddVideo: () => void;
  onTryPreset: () => void;
};

function FirstStepsCard({ onOpenAddVideo, onTryPreset }: FirstStepsCardProps) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "800", color: colors.primary }}>はじめに</Text>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.onSurface }}>
          練習したいフレーズを登録しよう
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {FIRST_STEPS.map((step, index) => (
          <View key={step} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primaryFixed,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.onPrimaryFixedVariant }}>
                {index + 1}
              </Text>
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: colors.onSurfaceVariant }} numberOfLines={1}>
              {step}
            </Text>
          </View>
        ))}
      </View>
      <Button
        label="YouTubeの動画を追加"
        onPress={onOpenAddVideo}
        variant="primary"
        size="lg"
        icon="add"
        fullWidth
      />
      <Button label="サンプル動画で試す" onPress={onTryPreset} variant="ghost" size="sm" fullWidth />
    </Card>
  );
}
