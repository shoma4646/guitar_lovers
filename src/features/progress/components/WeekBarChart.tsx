/**
 * 週次練習日バーチャート
 *
 * 曜日ごとに1本のバーで「その日に練習したか」（セッションまたは結果記録）だけを表す。
 * 色だけに頼らず、練習した日は白いチェックアイコンで、今日は枠線で区別する。
 */

import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EASING, ms } from "@/shared/lib/motion";

const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];
const WEEK_DAYS_LONG = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];
/** 曜日ごとの立ち上がりアニメーションの遅延幅（ミリ秒） */
const STAGGER_MS = 40;

type Props = {
  weeklyPracticedDays: boolean[];
};

function buildAccessibilityLabel(weeklyPracticedDays: boolean[]): string {
  const parts = weeklyPracticedDays.map(
    (practiced, idx) => `${WEEK_DAYS_LONG[idx]} ${practiced ? "練習した" : "練習なし"}`,
  );
  return `今週の練習: ${parts.join("、")}`;
}

export function WeekBarChart({ weeklyPracticedDays }: Props) {
  const reduced = useReducedMotion();
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={buildAccessibilityLabel(weeklyPracticedDays)}
      style={styles.bars}
    >
      {weeklyPracticedDays.map((practiced, idx) => (
        <WeekDayBar
          key={idx}
          practiced={practiced}
          isToday={idx === todayIdx}
          label={WEEK_DAYS[idx]}
          delay={idx * STAGGER_MS}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

type DayProps = {
  practiced: boolean;
  isToday: boolean;
  label: string;
  delay: number;
  reduced: boolean;
};

function WeekDayBar({ practiced, isToday, label, delay, reduced }: DayProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      reduced ? 0 : delay,
      withTiming(1, { duration: ms(reduced, "fast"), easing: EASING.decelerate }),
    );
  }, [reduced, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.7 + progress.value * 0.3 }],
  }));

  return (
    <View style={styles.column} accessible={false}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: practiced ? semantic.weekDone : semantic.weekTodo },
          isToday ? styles.today : null,
          animatedStyle,
        ]}
      >
        {practiced ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
      </Animated.View>
      <Text
        maxFontSizeMultiplier={1.3}
        style={[styles.dayLabel, isToday ? styles.dayLabelToday : null]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: "row",
    gap: 6,
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  bar: {
    width: "100%",
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  today: {
    borderWidth: 2,
    borderColor: colors.onPrimaryFixed,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.outline,
  },
  dayLabelToday: {
    color: colors.primary,
  },
});
