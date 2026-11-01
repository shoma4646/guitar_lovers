/**
 * 動画のシークバー
 *
 * 再生位置の表示はReanimatedのSharedValueを直接styleに反映し、200msごとのonTimeUpdateでも
 * JS側の再レンダリングを起こさない。
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  PanResponder,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { colors } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { formatSpokenDuration } from "@/features/practice/lib/formatters";
import { markerRatios, ratioToTime, timeToRatio } from "@/features/practice/lib/seekBar";
import type { ABLoop } from "@/shared/types/models";

type Props = {
  currentTimeShared: SharedValue<number>;
  duration: number;
  abLoop: ABLoop;
  /** ドラッグ開始時に呼ぶ（呼び出し側で一時停止する） */
  onScrubStart: () => void;
  /** ドラッグ終了時に呼ぶ（呼び出し側でシーク後に再生する） */
  onScrubEnd: (time: number) => void;
  /** ドラッグが中断されたとき（onPanResponderTerminate）に呼ぶ。シークはせず再生だけ再開する */
  onScrubCancel: () => void;
};

/** タップ・ドラッグの当たり判定を44pt確保するための外枠の高さ */
const TOUCH_HEIGHT = 44;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 16;
/** VoiceOverのincrement/decrementアクションで進める秒数 */
const A11Y_SEEK_STEP_SEC = 5;

export function PracticeSeekBar({
  currentTimeShared,
  duration,
  abLoop,
  onScrubStart,
  onScrubEnd,
  onScrubCancel,
}: Props) {
  const width = useSharedValue(0);
  const dragRatio = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // accessibilityValue/actions用の秒単位の現在位置。200msごとのcurrentTimeSharedをそのまま
  // React stateへ反映すると再レンダリングが増えるため、整数秒が変わったときだけ反映する
  const [a11yNow, setA11yNow] = useState(0);
  const lastWholeSecond = useSharedValue(-1);
  useDerivedValue(() => {
    const sec = Math.floor(currentTimeShared.value);
    if (sec !== lastWholeSecond.value) {
      lastWholeSecond.value = sec;
      runOnJS(setA11yNow)(sec);
    }
  });

  const markers = useMemo(() => markerRatios(abLoop, duration), [abLoop, duration]);
  const rangeRatio =
    abLoop.pointA !== null && abLoop.pointB !== null
      ? { start: timeToRatio(abLoop.pointA, duration), end: timeToRatio(abLoop.pointB, duration) }
      : null;

  const handleLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // 1画面に収まらずスクロールに切り替わったとき、ドラッグ中の縦ぶれで親のScrollViewに奪われないようにする
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          isDragging.value = true;
          runOnJS(onScrubStart)();
          dragRatio.value =
            width.value > 0 ? Math.max(0, Math.min(1, event.nativeEvent.locationX / width.value)) : 0;
        },
        onPanResponderMove: (event) => {
          if (width.value <= 0) return;
          dragRatio.value = Math.max(0, Math.min(1, event.nativeEvent.locationX / width.value));
        },
        onPanResponderRelease: () => {
          isDragging.value = false;
          const time = ratioToTime(dragRatio.value, durationRef.current);
          runOnJS(onScrubEnd)(time);
        },
        onPanResponderTerminate: () => {
          // ジェスチャーの異常終了。ドラッグ位置は確定させず、一時停止だけ解除して再生へ戻す
          isDragging.value = false;
          runOnJS(onScrubCancel)();
        },
      }),
    [dragRatio, isDragging, onScrubCancel, onScrubEnd, onScrubStart, width],
  );

  const fillStyle = useAnimatedStyle(() => {
    const ratio = isDragging.value ? dragRatio.value : timeToRatio(currentTimeShared.value, duration);
    return { width: `${ratio * 100}%` };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const ratio = isDragging.value ? dragRatio.value : timeToRatio(currentTimeShared.value, duration);
    return { left: `${ratio * 100}%` };
  });

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const delta =
        event.nativeEvent.actionName === "increment"
          ? A11Y_SEEK_STEP_SEC
          : event.nativeEvent.actionName === "decrement"
            ? -A11Y_SEEK_STEP_SEC
            : 0;
      if (delta === 0) return;
      const nextTime = Math.max(0, Math.min(duration, a11yNow + delta));
      onScrubStart();
      onScrubEnd(nextTime);
    },
    [a11yNow, duration, onScrubEnd, onScrubStart],
  );

  return (
    <View
      onLayout={handleLayout}
      style={{ height: TOUCH_HEIGHT, justifyContent: "center" }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="再生位置"
      accessibilityValue={{
        min: 0,
        max: Math.round(duration),
        now: a11yNow,
        text: `${formatSpokenDuration(a11yNow)} / ${formatSpokenDuration(duration)}`,
      }}
      accessibilityActions={[
        { name: "increment", label: `${A11Y_SEEK_STEP_SEC}秒進める` },
        { name: "decrement", label: `${A11Y_SEEK_STEP_SEC}秒戻す` },
      ]}
      onAccessibilityAction={handleAccessibilityAction}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: colors.surfaceContainer,
          overflow: "hidden",
        }}
      >
        <Animated.View style={[{ height: TRACK_HEIGHT, backgroundColor: colors.primary }, fillStyle]} />
      </View>

      {rangeRatio && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${rangeRatio.start * 100}%`,
            width: `${Math.max(0, rangeRatio.end - rangeRatio.start) * 100}%`,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            backgroundColor: semantic.progressGoal,
          }}
        />
      )}

      {markers.map((marker) => (
        <View
          key={marker.label}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${marker.ratio * 100}%`,
            marginLeft: -6,
            top: TOUCH_HEIGHT / 2 - TRACK_HEIGHT / 2 - 10,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: marker.label === "A" ? colors.primary : colors.secondary,
          }}
        />
      ))}

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            marginLeft: -THUMB_SIZE / 2,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.surfaceContainerLowest,
          },
          thumbStyle,
        ]}
      />
    </View>
  );
}
