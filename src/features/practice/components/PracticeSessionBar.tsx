/**
 * 練習中フレーズの下部固定バー（濃色）
 *
 * 「BPM NNでN回」の目標と弾き終えた回数を表示し、回数の増減と結果記録への導線を置く。
 * 目安回数に達しても自動では記録シートを開かず、「終了」を押したときだけ開く。
 * 指板を見たまま数えられるよう、回数の増減は振動と読み上げでも伝える。
 * BPMは記録される値であるmetronomeBpmをそのまま出す（今日の目標と異なるときだけ目標も添える）。
 */

import { useRef } from "react";
import { AccessibilityInfo, View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Icon } from "@/shared/components/atoms/Icon";
import { semantic } from "@/shared/theme/semantic";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER, SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";
import type { ActivePhrasePractice } from "@/stores/practice";

type Props = {
  practice: ActivePhrasePractice;
  /** 実際に記録されるBPM（メトロノームの現在値） */
  metronomeBpm: number;
  /** 回数を1増やし、増やした後の回数を返す */
  onIncrement: () => number;
  /** 回数を1減らし、減らした後の回数を返す */
  onDecrement: () => number;
  onFinish: () => void;
};

export function PracticeSessionBar({ practice, metronomeBpm, onIncrement, onDecrement, onFinish }: Props) {
  const { goalBpm, targetReps, completedReps, startedAt } = practice;
  const reachedStartedAtRef = useRef<number | null>(null);

  const handleIncrement = () => {
    const nextReps = onIncrement();
    if (nextReps === 0) return;
    void Haptics.selectionAsync();
    const isFirstReach = nextReps === targetReps && reachedStartedAtRef.current !== startedAt;
    if (!isFirstReach) {
      AccessibilityInfo.announceForAccessibility(`${nextReps}回`);
      return;
    }
    reachedStartedAtRef.current = startedAt;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // 続けて2回読み上げると iOS では後の読み上げが前を打ち切るため、1回にまとめる
    AccessibilityInfo.announceForAccessibility(
      `${nextReps}回。目安の${targetReps}回に達しました。終了で記録できます`,
    );
  };

  const handleDecrement = () => {
    if (completedReps === 0) return;
    AccessibilityInfo.announceForAccessibility(`${onDecrement()}回`);
  };
  const label =
    metronomeBpm === goalBpm
      ? `BPM ${metronomeBpm}で`
      : `BPM ${metronomeBpm}（目標${goalBpm}）`;

  return (
    <View testID="practice-session-bar" style={styles.bar}>
      <View testID="session-bar-summary" style={styles.summary}>
        <Text
          testID="session-bar-label"
          style={styles.label}
          numberOfLines={1}
          maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}
        >
          {label}
        </Text>
        <Text
          testID="session-bar-count"
          style={styles.count}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}
        >
          {completedReps}回
        </Text>
        <View style={styles.dots} accessible accessibilityLabel={`目安${targetReps}回のうち${completedReps}回`}>
          {Array.from({ length: targetReps }, (_, index) => (
            <View
              key={index}
              style={[styles.dot, { opacity: index < completedReps ? 1 : 0.35 }]}
            />
          ))}
        </View>
      </View>

      <View testID="session-bar-actions" style={styles.actions}>
        <Pressable
          onPress={handleDecrement}
          disabled={completedReps === 0}
          style={[styles.iconButton, { opacity: completedReps === 0 ? 0.4 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="回数を1減らす"
        >
          <Icon name="remove" size={20} color={semantic.sessionBarOn} />
        </Pressable>

        <Pressable
          onPress={handleIncrement}
          style={styles.incrementButton}
          accessibilityRole="button"
          accessibilityLabel={`1回弾いた、現在${completedReps}/${targetReps}回`}
        >
          <Text style={styles.incrementLabel} maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}>
            +1回
          </Text>
        </Pressable>

        <Pressable
          testID="session-bar-finish"
          onPress={onFinish}
          style={styles.finishButton}
          accessibilityRole="button"
          accessibilityLabel="練習を終えて結果を記録"
        >
          <Text style={styles.finishLabel} maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}>
            終了
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: semantic.sessionBarSurface,
    marginHorizontal: -SCREEN_HORIZONTAL_PADDING,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summary: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: semantic.sessionBarOn,
    opacity: 0.8,
  },
  count: {
    fontSize: 28,
    fontWeight: "800",
    color: semantic.sessionBarOn,
    fontVariant: ["tabular-nums"],
    lineHeight: 32,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.sessionBarAccent,
  },
  actions: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  incrementButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.sessionBarAccent,
  },
  incrementLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: semantic.sessionBarSurface,
  },
  finishButton: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: semantic.sessionBarOn,
  },
  finishLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: semantic.sessionBarOn,
  },
});
