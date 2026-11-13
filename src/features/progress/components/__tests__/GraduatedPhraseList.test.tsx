import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { PracticePhrase } from "@/shared/types/models";
import type { GraduatedPhraseSummary } from "@/features/progress/hooks/usePhraseProgressSummaries";
import { GraduatedPhraseList } from "../GraduatedPhraseList";

const LONG_NAME = "Sweet Child O' Mine イントロ";

const summary = {
  phrase: { id: "p1", name: LONG_NAME } as PracticePhrase,
  startBpm: 100,
  currentBpm: 200,
  targetBpm: 200,
  progressRatio: 1,
  graduatedAt: new Date(2026, 10, 12, 12).toISOString(),
} as GraduatedPhraseSummary;

describe("GraduatedPhraseList の文字拡大への備え", () => {
  it("行は最低56ptの高さを保ち、文字が大きいときは縮まずに伸びる", () => {
    render(<GraduatedPhraseList items={[summary]} />);
    const row = screen.getByLabelText(
      `${LONG_NAME}、11/12に卒業、100から200、目標200BPM`,
    );
    const style = StyleSheet.flatten(row.props.style);

    expect(style.minHeight).toBe(56);
    expect(style.height).toBeUndefined();
  });

  it("名前とバッジの文字に拡大の上限がある", () => {
    render(<GraduatedPhraseList items={[summary]} />);

    expect(screen.getByText(LONG_NAME).props.maxFontSizeMultiplier).toBe(1.3);
    expect(screen.getByText("卒業").props.maxFontSizeMultiplier).toBe(1.3);
  });

  it("バッジは高さを固定せず、文字に合わせて伸びる", () => {
    render(<GraduatedPhraseList items={[summary]} />);
    const badge = StyleSheet.flatten(screen.getByTestId("graduated-badge").props.style);

    expect(badge.height).toBeUndefined();
    expect(badge.minHeight).toBe(18);
  });

  it("範囲は縮んで折り返せ、卒業日を右端から押し出さない", () => {
    render(<GraduatedPhraseList items={[summary]} />);
    const range = StyleSheet.flatten(screen.getByText("100 → 200（目標200）").props.style);

    expect(range.flexShrink).toBe(1);
    expect(screen.getByText("11/12 卒業")).toBeTruthy();
  });
});
