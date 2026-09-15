/**
 * 練習中フレーズの下部固定バー
 *
 * 「BPM NNでN回」の目標と弾き終えた回数を表示し、1回ごとのカウントと結果記録への導線を置く。
 * メトロノームや動画までスクロールしても操作できるよう、PracticeTabのScrollViewの外に配置する。
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import type { ActivePhrasePractice } from "@/stores/practice";
import { cardShadowStyle } from "./cardStyle";

type Props = {
  practice: ActivePhrasePractice;
  /** 1回弾き終えたときに呼ぶ */
  onCountRep: () => void;
  /** 練習を終えて結果記録へ進むときに呼ぶ */
  onFinish: () => void;
};

export function ActivePracticeBar({ practice, onCountRep, onFinish }: Props) {
  const { phrase, todayTargetBpm, targetReps, completedReps } = practice;
  const extraReps = Math.max(0, completedReps - targetReps);

  return (
    <View className="bg-surface-container-lowest" style={[cardShadowStyle, styles.bar]}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Icon name="star" size={18} color={colors.tertiary} />
        <Text
          className="text-body-md"
          style={{ flex: 1, color: colors.onSurface, fontWeight: "600" }}
          numberOfLines={1}
        >
          {phrase.name}
        </Text>
        <Text className="text-label-sm" style={{ color: colors.primary, fontWeight: "700" }}>
          BPM {todayTargetBpm}で{targetReps}回
        </Text>
      </View>

      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View
          className="flex-row items-center"
          style={{ flex: 1, gap: 6 }}
          accessible
          accessibilityLabel={`${completedReps}/${targetReps}回`}
        >
          {Array.from({ length: targetReps }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index < completedReps ? colors.primary : colors.surfaceContainerHighest,
                },
              ]}
            />
          ))}
          {extraReps > 0 && (
            <Text className="text-label-sm" style={{ color: colors.primary, fontWeight: "700" }}>
              +{extraReps}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onFinish}
          className="active:opacity-80"
          style={[styles.button, { borderWidth: 1, borderColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="練習を終えて結果を記録"
        >
          <Text className="text-label-sm" style={{ color: colors.primary, fontWeight: "700" }}>
            記録
          </Text>
        </Pressable>

        <Pressable
          onPress={onCountRep}
          className="active:opacity-90"
          style={[styles.button, { paddingHorizontal: 20, backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`1回弾いた、現在${completedReps}/${targetReps}回`}
        >
          <Text className="text-label-sm" style={{ color: colors.onPrimary, fontWeight: "700" }}>
            +1回
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
});
