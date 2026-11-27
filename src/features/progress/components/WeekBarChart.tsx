/**
 * 週次練習日バーチャート
 *
 * 曜日ごとに1本のバーで「練習した／練習しなかった／まだ来ていない」を表す。
 * 色だけに頼らず、練習した日は白いチェックアイコン、今日は太い枠線、まだ来ていない日は塗らない枠線で区別する。
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
  /** 月〜日の練習有無 */
  weeklyPracticedDays: boolean[];
  /** 今日の曜日番号（月曜=0〜日曜=6）。週の集計と同じ基準日から渡す */
  todayIndex: number;
};

type DayState = "done" | "missed" | "upcoming";

function dayState(practiced: boolean, idx: number, todayIndex: number): DayState {
  if (practiced) return "done";
  return idx > todayIndex ? "upcoming" : "missed";
}

function buildAccessibilityLabel(weeklyPracticedDays: boolean[], todayIndex: number): string {
  const practicedCount = weeklyPracticedDays.filter(Boolean).length;
  const futureDays = weeklyPracticedDays.slice(todayIndex + 1);
  const collapseFuture = futureDays.length > 1 && !futureDays.some(Boolean);
  const listedDays = collapseFuture
    ? weeklyPracticedDays.slice(0, todayIndex + 1)
    : weeklyPracticedDays;
  const parts = listedDays.map((practiced, idx) => {
    const day = idx === todayIndex ? `${WEEK_DAYS_LONG[idx]}（今日）` : WEEK_DAYS_LONG[idx];
    const state = dayState(practiced, idx, todayIndex);
    if (state === "done") return `${day} 練習した`;
    if (state === "upcoming") return `${day} これから`;
    return `${day} ${idx === todayIndex ? "まだ" : "練習なし"}`;
  });
  if (collapseFuture) parts.push(`${WEEK_DAYS_LONG[todayIndex + 1]}以降 これから`);
  return `今週の練習 ${weeklyPracticedDays.length}日中${practicedCount}日。${parts.join("、")}`;
}

export function WeekBarChart({ weeklyPracticedDays, todayIndex }: Props) {
  const reduced = useReducedMotion();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={buildAccessibilityLabel(weeklyPracticedDays, todayIndex)}
      style={styles.bars}
    >
      {weeklyPracticedDays.map((practiced, idx) => (
        <WeekDayBar
          key={idx}
          testID={`week-bar-${idx}`}
          state={dayState(practiced, idx, todayIndex)}
          isToday={idx === todayIndex}
          label={WEEK_DAYS[idx]}
          delay={idx * STAGGER_MS}
          reduced={reduced}
        />
      ))}
    </View>
  );
}

type DayProps = {
  testID: string;
  state: DayState;
  isToday: boolean;
  label: string;
  delay: number;
  reduced: boolean;
};

const BAR_STATE_STYLE = {
  done: { backgroundColor: semantic.weekDone },
  missed: { backgroundColor: semantic.weekTodo },
  upcoming: { backgroundColor: "transparent", borderWidth: 1, borderColor: semantic.weekUpcoming },
} as const;

function WeekDayBar({ testID, state, isToday, label, delay, reduced }: DayProps) {
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
        testID={testID}
        style={[styles.bar, BAR_STATE_STYLE[state], isToday ? styles.today : null, animatedStyle]}
      >
        {state === "done" ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
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
    color: colors.onSurfaceVariant,
  },
  dayLabelToday: {
    color: colors.primary,
  },
});
