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

describe("PracticeSessionBar の横幅が足りないとき", () => {
  function renderBar() {
    render(
      <PracticeSessionBar
        practice={practice}
        metronomeBpm={240}
        onIncrement={jest.fn()}
        onDecrement={jest.fn()}
        onFinish={jest.fn()}
      />,
    );
  }

  it("左のBPMと回数の列が縮み、右のボタン群は縮まない", () => {
    renderBar();
    const summary = StyleSheet.flatten(screen.getByTestId("session-bar-summary").props.style);
    const actions = StyleSheet.flatten(screen.getByTestId("session-bar-actions").props.style);

    expect(summary.flex).toBe(1);
    expect(summary.minWidth).toBe(0);
    expect(actions.flexShrink).toBe(0);
  });

  it("BPMの表示と回数は1行に収め、はみ出す分は省略・縮小する", () => {
    renderBar();
    const label = screen.getByTestId("session-bar-label");
    const count = screen.getByTestId("session-bar-count");

    expect(label).toHaveTextContent("BPM 240（目標100）");
    expect(label.props.numberOfLines).toBe(1);
    expect(count.props.numberOfLines).toBe(1);
    expect(count.props.adjustsFontSizeToFit).toBe(true);
  });

  it("BPMの表示・「+1回」・「終了」は文字サイズの拡大に上限を付ける", () => {
    renderBar();

    expect(screen.getByTestId("session-bar-label").props.maxFontSizeMultiplier).toBe(
      NUMERIC_MAX_FONT_SIZE_MULTIPLIER,
    );
    expect(screen.getByText("+1回").props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
    expect(screen.getByText("終了").props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
  });

  it("「終了」のタップ領域は44pt四方以上を保つ", () => {
    renderBar();
    const finish = StyleSheet.flatten(screen.getByTestId("session-bar-finish").props.style);

    expect(finish.height).toBeGreaterThanOrEqual(44);
    expect(finish.minWidth).toBeGreaterThanOrEqual(44);
  });
});
