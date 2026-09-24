/**
 * 練習中フレーズの下部固定バー（濃色）
 *
 * 「BPM NNでN回」の目標と弾き終えた回数を表示し、回数の増減と結果記録への導線を置く。
 * 目安回数に達しても自動では記録シートを開かず、「終了」を押したときだけ開く。
 * BPMは記録される値であるmetronomeBpmをそのまま出す（今日の目標と異なるときだけ目標も添える）。
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { semantic } from "@/shared/theme/semantic";
import type { ActivePhrasePractice } from "@/stores/practice";

type Props = {
  practice: ActivePhrasePractice;
  /** 実際に記録されるBPM（メトロノームの現在値） */
  metronomeBpm: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onFinish: () => void;
};

export function PracticeSessionBar({ practice, metronomeBpm, onIncrement, onDecrement, onFinish }: Props) {
  const { todayTargetBpm, targetReps, completedReps } = practice;
  const label =
    metronomeBpm === todayTargetBpm
      ? `BPM ${metronomeBpm}で`
      : `BPM ${metronomeBpm}（目標${todayTargetBpm}）`;

  return (
    <View style={styles.bar}>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{completedReps}回</Text>
        <View style={styles.dots} accessible accessibilityLabel={`目安${targetReps}回のうち${completedReps}回`}>
          {Array.from({ length: targetReps }, (_, index) => (
            <View
              key={index}
              style={[styles.dot, { opacity: index < completedReps ? 1 : 0.35 }]}
            />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onDecrement}
          disabled={completedReps === 0}
          style={[styles.iconButton, { opacity: completedReps === 0 ? 0.4 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="回数を1減らす"
        >
          <Icon name="remove" size={20} color={semantic.sessionBarOn} />
        </Pressable>

        <Pressable
          onPress={onIncrement}
          style={styles.incrementButton}
          accessibilityRole="button"
          accessibilityLabel={`1回弾いた、現在${completedReps}/${targetReps}回`}
        >
          <Text style={styles.incrementLabel}>+1回</Text>
        </Pressable>

        <Pressable
          onPress={onFinish}
          style={styles.finishButton}
          accessibilityRole="button"
          accessibilityLabel="練習を終えて結果を記録"
        >
          <Text style={styles.finishLabel}>終了</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: semantic.sessionBarSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
