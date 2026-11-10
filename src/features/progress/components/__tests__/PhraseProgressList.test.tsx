import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { PracticePhrase } from "@/shared/types/models";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";
import { PhraseProgressList } from "../PhraseProgressList";

const LONG_NAME = "Sweet Child O' Mine イントロ";

const summary = {
  phrase: { id: "p1", name: LONG_NAME } as PracticePhrase,
  startBpm: 150,
  currentBpm: 180,
  targetBpm: 200,
  progressRatio: 0.6,
} as PhraseProgressSummary;

describe("PhraseProgressList の行の並び", () => {
  it("名前は1行を単独で使い、範囲は名前と同じ行に入らない", () => {
    render(<PhraseProgressList items={[summary]} />);
    const name = screen.getByText(LONG_NAME);
    const range = screen.getByTestId("phrase-progress-range");
    const meterLine = screen.getByTestId("phrase-progress-meter");

    expect(meterLine.findAll(() => true)).toContain(range);
    expect(meterLine.findAll(() => true)).not.toContain(name);
    expect(name.props.numberOfLines).toBe(1);
    expect(range).toHaveTextContent("150 → 180 / 目標200");
  });

  it("範囲は進捗バーと同じ2段目に並ぶ", () => {
    render(<PhraseProgressList items={[summary]} />);
    const secondLine = screen.getByTestId("phrase-progress-meter");

    expect(secondLine.findAll(() => true)).toContain(screen.getByTestId("phrase-progress-range"));
    expect(secondLine.findAll(() => true)).toContain(screen.getByRole("progressbar"));
  });

  it("行は最低56ptの高さを保ち、文字が大きいときは縮まずに伸びる", () => {
    render(<PhraseProgressList items={[summary]} />);
    const row = screen.getByLabelText(`${LONG_NAME}、開始150から目標200のうち現在180`);
    const style = StyleSheet.flatten(row.props.style);

    expect(style.minHeight).toBe(56);
    expect(style.height).toBeUndefined();
  });
});
