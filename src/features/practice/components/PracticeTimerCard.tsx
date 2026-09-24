/**
 * 練習タイマーカード
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { formatDuration } from "@/features/practice/lib/formatters";
import { cardShadowStyle, cardStyle } from "./cardStyle";

type Props = {
  displaySeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onSaveSession: () => void;
};

export function PracticeTimerCard({
  displaySeconds,
  isTimerRunning,
  onToggleTimer,
  onSaveSession,
}: Props) {
  return (
    <View
      className="bg-surface-container-lowest"
      style={[
        cardStyle,
        cardShadowStyle,
        { marginBottom: 16, alignItems: "center", gap: 16 },
      ]}
    >
      <Text
        className="text-label-sm"
        style={{
          color: colors.onSurfaceVariant,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: "600",
        }}
      >
        PRACTICE TIMER
      </Text>
      <Text style={styles.timerDisplay}>{formatDuration(displaySeconds)}</Text>
      <View className="flex-row" style={{ gap: 12 }}>
        <Pressable
          onPress={onToggleTimer}
          className="flex-row items-center active:opacity-90"
          style={{
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 9999,
            gap: 6,
            backgroundColor: isTimerRunning ? colors.error : colors.primary,
          }}
          accessibilityRole="button"
        >
          <Icon
            name={isTimerRunning ? "pause" : "play_arrow"}
            size={18}
            color={colors.onPrimary}
          />
          <Text
            className="text-label-sm"
            style={{ color: colors.onPrimary, fontWeight: "700" }}
          >
            {isTimerRunning ? "一時停止" : "計測"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onSaveSession}
          className="flex-row items-center active:opacity-90"
          style={{
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 9999,
            gap: 6,
            backgroundColor: `${colors.secondaryContainer}33`,
            borderWidth: 1,
            borderColor: colors.secondary,
          }}
          accessibilityRole="button"
        >
          <Icon name="emoji_events" size={18} color={colors.secondary} />
          <Text
            className="text-label-sm"
            style={{ color: colors.secondary, fontWeight: "700" }}
          >
            記録
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerDisplay: {
    fontSize: 64,
    fontWeight: "800",
    lineHeight: 64,
    letterSpacing: -2.56,
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
});
