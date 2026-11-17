import { act, fireEvent } from "@testing-library/react-native";

type PressTarget = Parameters<typeof fireEvent.press>[0];

/**
 * 実機のPressableと同じ順序（pressIn → 押し続ける → pressOut → press）で長押しを送る。
 * onLongPressを渡していないPressableは、長押しのあと指を離したときにもonPressを呼ぶ。
 * 偽タイマー（jest.useFakeTimers）前提で、押している間は10msごとに時間を進めて再描画させる。
 */
export function pressAndHold(element: PressTarget, durationMs: number): void {
  fireEvent(element, "pressIn");
  for (let elapsed = 0; elapsed < durationMs; elapsed += 10) {
    act(() => {
      jest.advanceTimersByTime(10);
    });
  }
  fireEvent(element, "pressOut");
  fireEvent.press(element);
}
