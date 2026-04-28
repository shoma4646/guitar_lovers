import { View, Text, StyleSheet, Animated } from "react-native";
import { colors } from "@/shared/constants/colors";

const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

type Props = {
  weeklyData: number[];
};

/** 週次練習時間バーチャート（View基底、ライブラリ不使用） */
export function WeekBarChart({ weeklyData }: Props) {
  const maxVal = Math.max(...weeklyData, 1);
  const today = new Date();
  /** 今日の曜日インデックス（0=月曜） */
  const todayIdx = (today.getDay() + 6) % 7;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>今週の練習</Text>
      <View style={styles.bars}>
        {weeklyData.map((val, idx) => {
          const ratio = val / maxVal;
          const isToday = idx === todayIdx;
          const barColor = isToday ? colors.primary : colors.secondary + "88";

          return (
            <View key={idx} style={styles.column}>
              <Text style={styles.barValue}>
                {val > 0 ? Math.floor(val / 60) : ""}
              </Text>
              <View style={styles.barBg}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(ratio * 100, val > 0 ? 4 : 0)}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.barLabel,
                  {
                    color: isToday ? colors.primary : colors.textGray,
                    fontWeight: isToday ? "700" : "400",
                  },
                ]}
              >
                {WEEK_DAYS[idx]}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.unit}>単位: 分</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
    backgroundColor: colors.bgLightDark,
  },
  title: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "600",
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 100,
  },
  column: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    gap: 4,
  },
  barValue: {
    color: colors.textGray,
    fontSize: 9,
    height: 12,
  },
  barBg: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF11",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 11,
  },
  unit: {
    color: colors.textGray,
    fontSize: 10,
    textAlign: "right",
  },
});
