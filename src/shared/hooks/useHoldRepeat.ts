import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/** 長押しで押し続けたときの最初の連続入力までの遅延（ミリ秒） */
const HOLD_REPEAT_DELAY_MS = 350;
/** 長押し中の連続入力の間隔（ミリ秒） */
const HOLD_REPEAT_INTERVAL_MS = 70;

/**
 * Pressableの長押しでコールバックを繰り返し呼ぶ（押している間も毎回最新のonStepを呼ぶ）
 * VoiceOverのダブルタップはonPressIn/onPressOutを発火せずonPressのみを呼ぶため、
 * 長押しリピートが始まっていなければonPressでも1段階だけ進められるようにする
 * @param onStep - 1段階進めるコールバック
 * @param disabled - trueになった時点で連続入力を止める（上限・下限に達したボタンなど）
 * @returns Pressableに渡すonPress/onPressIn/onPressOut
 */
export function useHoldRepeat(onStep: () => void, disabled = false) {
  const latestOnStepRef = useRef(onStep);
  useLayoutEffect(() => {
    latestOnStepRef.current = onStep;
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatingRef = useRef(false);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const handlePressIn = useCallback(() => {
    stop();
    repeatingRef.current = false;
    timeoutRef.current = setTimeout(() => {
      repeatingRef.current = true;
      latestOnStepRef.current();
      intervalRef.current = setInterval(() => latestOnStepRef.current(), HOLD_REPEAT_INTERVAL_MS);
    }, HOLD_REPEAT_DELAY_MS);
  }, [stop]);

  const handlePressOut = useCallback(() => {
    stop();
  }, [stop]);

  const handlePress = useCallback(() => {
    if (!repeatingRef.current) onStep();
  }, [onStep]);

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  useEffect(() => stop, [stop]);

  return { onPress: handlePress, onPressIn: handlePressIn, onPressOut: handlePressOut };
}
