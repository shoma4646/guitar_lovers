import { render, screen } from "@testing-library/react-native";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
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
