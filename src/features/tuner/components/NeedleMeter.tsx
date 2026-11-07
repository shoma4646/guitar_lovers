/**
 * チューニング針メーター
 *
 * react-native-svgを使わず、Viewの合成（円のborderWidthを当てて下半分だけを見せる）で半円ゲージを描く。
 * ±50centsを±60度の針の傾きに対応させ、中央±5centsを帯で示す。
 */

import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/shared/theme";
import { TUNING_THRESHOLD_CENTS } from "@/shared/constants/tuning";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { ms } from "@/shared/lib/motion";
import {
  centsToMeterRatio,
  METER_MAX_CENTS,
  tuningColor,
  type TuningState,
} from "@/features/tuner/lib/meter";

type Props = {
  /** 生のセント値。±50を超える値も受け取り、丸めて表示する */
  cents: number;
  /** 検出中の音があるか。falseの間は針を中央のアイドル色で止める */
  hasSignal: boolean;
  state: TuningState;
};

const MAX_ANGLE_DEG = 60;
const MAX_RING_DIAMETER = 256;
const RING_STROKE_WIDTH = 12;
const TICK_GAP_FROM_RING = 4;
const MAX_NEEDLE_LENGTH = 80;
const TICK_STEP_CENTS = 10;
const TICK_VALUES = Array.from(
  { length: (METER_MAX_CENTS * 2) / TICK_STEP_CENTS + 1 },
  (_, i) => -METER_MAX_CENTS + i * TICK_STEP_CENTS,
);
const IN_TUNE_HALF_ANGLE_RAD =
  (TUNING_THRESHOLD_CENTS / METER_MAX_CENTS) * MAX_ANGLE_DEG * (Math.PI / 180);

type MeterGeometry = {
  diameter: number;
  radius: number;
  /** 円の中心を枠の下端に置くため、半径より低いと頂点の帯が切り取られる（線の太さ分は上の余白） */
  frameHeight: number;
  tickOuterRadius: number;
  needleLength: number;
  /** 中央帯の弦幅。±TUNING_THRESHOLD_CENTS分の弧（±60度換算）に対応する弦の長さ */
  inTuneBandWidth: number;
};

/**
 * 表示枠の幅に収まる円の直径（最大256）と、それに比例させた各部の寸法を返す
 * @param frameWidth - 表示枠の幅。未計測ならundefined
 */
function meterGeometry(frameWidth: number | undefined): MeterGeometry {
  const diameter = Math.min(MAX_RING_DIAMETER, frameWidth ?? MAX_RING_DIAMETER);
  const radius = diameter / 2;
  return {
    diameter,
    radius,
    frameHeight: radius + RING_STROKE_WIDTH,
    tickOuterRadius: radius - RING_STROKE_WIDTH - TICK_GAP_FROM_RING,
    needleLength: MAX_NEEDLE_LENGTH * (diameter / MAX_RING_DIAMETER),
    inTuneBandWidth: 2 * radius * Math.sin(IN_TUNE_HALF_ANGLE_RAD),
  };
}

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

  const [frameWidth, setFrameWidth] = useState<number | undefined>(undefined);
  const geometry = meterGeometry(frameWidth);
  const handleLayout = (event: LayoutChangeEvent) => {
    setFrameWidth(event.nativeEvent.layout.width);
  };

  const needleColor = tuningColor(state, hasSignal);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  return (
    <View
      testID="needle-meter"
      style={[styles.wrap, { height: geometry.frameHeight }]}
      accessible={false}
      onLayout={handleLayout}
    >
      <View
        testID="needle-meter-ring"
        style={[
          styles.ringTrack,
          {
            width: geometry.diameter,
            height: geometry.diameter,
            bottom: -geometry.radius,
            borderRadius: geometry.radius,
          },
        ]}
      />
      <View
        testID="needle-meter-in-tune-band"
        style={[
          styles.inTuneBand,
          {
            width: geometry.inTuneBandWidth,
            marginLeft: -geometry.inTuneBandWidth / 2,
            height: geometry.diameter,
            bottom: -geometry.radius,
          },
        ]}
      />
      {TICK_VALUES.map((value) => (
        <View
          key={value}
          style={[
            styles.tickPivot,
            {
              height: geometry.tickOuterRadius,
              transform: [{ rotate: `${centsToAngleDeg(value)}deg` }],
            },
          ]}
        >
          <View style={styles.tick} />
        </View>
      ))}
      <Animated.View
        testID="needle-meter-needle"
        style={[styles.needlePivot, { height: geometry.needleLength }, needleStyle]}
      >
        <View
          style={[styles.needle, { height: geometry.needleLength, backgroundColor: needleColor }]}
        />
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
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  ringTrack: {
    position: "absolute",
    borderWidth: RING_STROKE_WIDTH,
    borderColor: colors.surfaceContainerHigh,
  },
  inTuneBand: {
    position: "absolute",
    left: "50%",
    borderTopWidth: RING_STROKE_WIDTH,
    borderColor: colors.primaryContainer,
  },
  tickPivot: {
    position: "absolute",
    bottom: 0,
    width: 2,
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
    alignItems: "center",
    transformOrigin: "bottom",
  },
  needle: {
    width: 3,
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
