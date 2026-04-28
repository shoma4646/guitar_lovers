import { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Animated,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/shared/constants/colors";
import { usePracticeStore, PRESET_BPMS } from "@/stores/practice";

/**
 * メトロノームウィジェット
 * BPM調整・プリセット選択・有効/無効の切り替えを提供する
 */
export function MetronomeWidget() {
  const bpm = usePracticeStore((s) => s.metronomeBpm);
  const enabled = usePracticeStore((s) => s.metronomeEnabled);
  const setMetronomeBpm = usePracticeStore((s) => s.setMetronomeBpm);
  const setMetronomeEnabled = usePracticeStore((s) => s.setMetronomeEnabled);

  const beatScale = useRef(new Animated.Value(1)).current;
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animateBeat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(beatScale, {
        toValue: 1.15,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(beatScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [beatScale]);

  useEffect(() => {
    if (enabled) {
      const intervalMs = (60 / bpm) * 1000;
      animateBeat();
      beatTimerRef.current = setInterval(animateBeat, intervalMs);
    } else if (beatTimerRef.current) {
      clearInterval(beatTimerRef.current);
      beatTimerRef.current = null;
    }
    return () => {
      if (beatTimerRef.current) {
        clearInterval(beatTimerRef.current);
        beatTimerRef.current = null;
      }
    };
  }, [enabled, bpm, animateBeat]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>メトロノーム</Text>
        <Switch
          value={enabled}
          onValueChange={setMetronomeEnabled}
          trackColor={{ false: colors.bgGray, true: colors.primary + "99" }}
          thumbColor={enabled ? colors.primary : colors.textGray}
          accessibilityLabel="メトロノームのオン/オフ"
        />
      </View>

      <View style={styles.bpmCircleRow}>
        <TouchableOpacity
          onPress={() => setMetronomeBpm(bpm - 5)}
          style={styles.adjustBtn}
          accessibilityLabel="BPMを5下げる"
        >
          <Ionicons name="remove" size={20} color={colors.textWhite} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.bpmCircle,
            {
              backgroundColor: enabled ? colors.primary : colors.bgGray,
              transform: [{ scale: beatScale }],
            },
          ]}
        >
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Text style={styles.bpmLabel}>BPM</Text>
        </Animated.View>

        <TouchableOpacity
          onPress={() => setMetronomeBpm(bpm + 5)}
          style={styles.adjustBtn}
          accessibilityLabel="BPMを5上げる"
        >
          <Ionicons name="add" size={20} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      <View style={styles.presetRow}>
        {PRESET_BPMS.map((presetBpm) => {
          const active = bpm === presetBpm;
          return (
            <TouchableOpacity
              key={presetBpm}
              onPress={() => setMetronomeBpm(presetBpm)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.bgGray,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.textWhite : colors.textGray },
                ]}
              >
                {presetBpm}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    backgroundColor: colors.bgLightDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "600",
  },
  bpmCircleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgGray,
  },
  bpmCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bpmValue: {
    color: colors.textWhite,
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  bpmLabel: {
    color: colors.textWhite + "CC",
    fontSize: 12,
    fontWeight: "500",
  },
  presetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
