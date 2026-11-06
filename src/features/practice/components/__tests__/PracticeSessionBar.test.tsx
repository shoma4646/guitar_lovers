import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER, SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";
import type { ActivePhrasePractice } from "@/stores/practice";
import { PracticeSessionBar } from "../PracticeSessionBar";

const practice = {
  goalBpm: 100,
  targetReps: 5,
  completedReps: 2,
} as ActivePhrasePractice;

describe("PracticeSessionBar の文字サイズ拡大", () => {
  it("回数の数値は文字サイズの拡大に上限を付ける", () => {
    render(
      <PracticeSessionBar
        practice={practice}
        metronomeBpm={100}
        onIncrement={jest.fn()}
        onDecrement={jest.fn()}
        onFinish={jest.fn()}
      />,
    );
    const count = screen.getByTestId("session-bar-count");
    expect(count).toHaveTextContent("2回");
    expect(count.props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
  });
});

describe("PracticeSessionBar の形（画面下に貼り付くシート）", () => {
  it("画面の左右余白を打ち消して横幅いっぱいに広がり、上の2つの角だけを丸める", () => {
    render(
      <PracticeSessionBar
        practice={practice}
        metronomeBpm={100}
        onIncrement={jest.fn()}
        onDecrement={jest.fn()}
        onFinish={jest.fn()}
      />,
    );
    const style = StyleSheet.flatten(screen.getByTestId("practice-session-bar").props.style);

    expect(style.marginHorizontal).toBe(-SCREEN_HORIZONTAL_PADDING);
    expect(style.borderTopLeftRadius).toBe(20);
    expect(style.borderTopRightRadius).toBe(20);
    expect(style.borderBottomLeftRadius).toBeUndefined();
    expect(style.borderBottomRightRadius).toBeUndefined();
  });
});
