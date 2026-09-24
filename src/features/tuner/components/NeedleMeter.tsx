/**
 * チューニング針メーター
 *
 * react-native-svgを使わず、Viewの合成（円のborderWidthを当てて下半分だけを見せる）で半円ゲージを描く。
 * ±50centsを±60度の針の傾きに対応させ、中央±5centsを帯で示す。
 */

import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { TUNING_THRESHOLD_CENTS } from "@/shared/constants/tuning";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { ms } from "@/shared/lib/motion";
import { centsToMeterRatio, METER_MAX_CENTS, type TuningState } from "@/features/tuner/lib/meter";

type Props = {
  /** 生のセント値。±50を超える値も受け取り、丸めて表示する */
  cents: number;
  /** 検出中の音があるか。falseの間は針を中央のアイドル色で止める */
  hasSignal: boolean;
  state: TuningState;
};

const MAX_ANGLE_DEG = 60;
const RING_DIAMETER = 256;
const RING_RADIUS = RING_DIAMETER / 2;
const NEEDLE_LENGTH = 80;
const TICK_STEP_CENTS = 10;
const TICK_VALUES = Array.from(
  { length: (METER_MAX_CENTS * 2) / TICK_STEP_CENTS + 1 },
  (_, i) => -METER_MAX_CENTS + i * TICK_STEP_CENTS,
);
// 中央帯の弦幅。半径128の円で±TUNING_THRESHOLD_CENTS分の弧（±60度換算）に対応する弦の長さ
const IN_TUNE_BAND_WIDTH =
  2 *
  RING_RADIUS *
  Math.sin((TUNING_THRESHOLD_CENTS / METER_MAX_CENTS) * MAX_ANGLE_DEG * (Math.PI / 180));

/** セント値（範囲外含む）を針の回転角度（度）に変換する */
function centsToAngleDeg(cents: number): number {
  return (centsToMeterRatio(cents) - 0.5) * (MAX_ANGLE_DEG * 2);
}

export function NeedleMeter({ cents, hasSignal, state }: Props) {
  const reduced = useReducedMotion();
  const angle = useSharedValue(0);

  useEffect(() => {
    const target = hasSignal ? centsToAngleDeg(cents) : 0;
    angle.value = reduced
      ? withTiming(target, { duration: ms(reduced, "instant") })
      : withSpring(target, { damping: 14, stiffness: 120 });
  }, [angle, cents, hasSignal, reduced]);

  const needleColor = !hasSignal
    ? semantic.tunerIdle
    : state === "in"
      ? semantic.tunerInTune
      : semantic.tunerOff;

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  return (
    <View style={styles.wrap} accessible={false}>
      <View style={styles.ringTrack} />
      <View
        style={[
          styles.inTuneBand,
          { width: IN_TUNE_BAND_WIDTH, marginLeft: -IN_TUNE_BAND_WIDTH / 2 },
        ]}
      />
      {TICK_VALUES.map((value) => (
        <View
          key={value}
          style={[styles.tickPivot, { transform: [{ rotate: `${centsToAngleDeg(value)}deg` }] }]}
        >
          <View style={styles.tick} />
        </View>
      ))}
      <Animated.View style={[styles.needlePivot, needleStyle]}>
        <View style={[styles.needle, { backgroundColor: needleColor }]} />
        <View
          style={[
            styles.needleHead,
            { backgroundColor: needleColor, borderColor: colors.surfaceContainerLowest },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  ringTrack: {
    position: "absolute",
    width: RING_DIAMETER,
    height: RING_DIAMETER,
    bottom: -RING_RADIUS,
    borderWidth: 12,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: RING_RADIUS,
  },
  inTuneBand: {
    position: "absolute",
    height: RING_DIAMETER,
    bottom: -RING_RADIUS,
    left: "50%",
    borderTopWidth: 12,
    borderColor: colors.primaryContainer,
  },
  tickPivot: {
    position: "absolute",
    bottom: 0,
    width: 2,
    height: 92,
    alignItems: "center",
    transformOrigin: "bottom",
  },
  tick: {
    width: 2,
    height: 8,
    borderRadius: 1,
    backgroundColor: colors.outlineVariant,
  },
  needlePivot: {
    position: "absolute",
    bottom: 0,
    width: 4,
    height: NEEDLE_LENGTH,
    alignItems: "center",
    transformOrigin: "bottom",
  },
  needle: {
    width: 3,
    height: NEEDLE_LENGTH,
    borderRadius: 2,
  },
  needleHead: {
    position: "absolute",
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
