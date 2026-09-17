/**
 * 週次練習日バーチャート（Stitch modern_2 風）
 *
 * - 曜日ごとに1本のバー。「その日に練習したか」（セッションまたは結果記録）だけを表す
 * - 練習した日は一定の高さで塗り、今日は fully primary で強調する
 */

import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/shared/theme";

const WEEK_DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  weeklyPracticedDays: boolean[];
};

/** 練習有無と今日かどうかから primary の不透明度を決める */
function barColor(practiced: boolean, isToday: boolean): string {
  if (isToday) return colors.primary;
  return practiced ? `${colors.primary}99` : `${colors.primary}1a`;
}

export function WeekBarChart({ weeklyPracticedDays }: Props) {
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7;

  return (
    <View
      className="bg-surface-container-lowest"
      style={[styles.container, shadowStyle]}
    >
      <Text
        className="text-label-sm"
        style={{
          color: colors.outline,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: "600",
          marginBottom: 16,
        }}
      >
        今週の練習日
      </Text>
      <View style={styles.bars}>
        {weeklyPracticedDays.map((practiced, idx) => {
          const isToday = idx === todayIdx;
          const height = practiced ? "100%" : "4%";

          return (
            <View key={idx} style={styles.column}>
              <View
                style={{
                  width: "100%",
                  height,
                  backgroundColor: barColor(practiced, isToday),
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              />
              <Text
                className="text-[10px]"
                style={{
                  color: isToday ? colors.primary : colors.outline,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                {WEEK_DAYS_EN[idx]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const shadowStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 128,
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
});
