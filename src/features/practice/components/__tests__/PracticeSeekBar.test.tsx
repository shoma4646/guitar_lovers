import { render, screen } from "@testing-library/react-native";
import { PracticeSeekBar } from "../PracticeSeekBar";

// 共通モックのuseSharedValueは描画ごとに新しい値を返し、useDerivedValue内のsetStateが無限に再描画するため
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const { useEffect, useRef } = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: { View },
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (initial: unknown) => useRef({ value: initial }).current,
    useDerivedValue: (factory: () => unknown) => {
      useEffect(() => {
        factory();
      });
    },
  };
});

describe("PracticeSeekBar のアクセシビリティ", () => {
  it("再生位置として1要素にまとまり、値を読み上げ用の文字列でも持つ", () => {
    render(
      <PracticeSeekBar
        currentTimeShared={{ value: 72 } as never}
        duration={220}
        abLoop={{ pointA: null, pointB: null, enabled: false }}
        onScrubStart={jest.fn()}
        onScrubEnd={jest.fn()}
        onScrubCancel={jest.fn()}
        scrubbingRef={{ current: false }}
      />,
    );
    const seekBar = screen.getByRole("adjustable", { name: "再生位置" });
    expect(seekBar.props.accessible).toBe(true);
    expect(seekBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 220,
      now: 72,
      text: "1分12秒 / 3分40秒",
    });
  });
});
