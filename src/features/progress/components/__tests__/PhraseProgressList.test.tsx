import { fireEvent, render, screen } from "@testing-library/react-native";
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

describe("PhraseProgressList の範囲欄の幅", () => {
  const narrow = {
    phrase: { id: "p2", name: "サビ" } as PracticePhrase,
    startBpm: 60,
    currentBpm: 70,
    targetBpm: 200,
    progressRatio: 0.07,
  } as PhraseProgressSummary;
  const wide = {
    phrase: { id: "p3", name: "イントロ" } as PracticePhrase,
    startBpm: 100,
    currentBpm: 142,
    targetBpm: 180,
    progressRatio: 0.53,
  } as PhraseProgressSummary;

  function layoutTemplate(width: number) {
    fireEvent(screen.getByTestId("phrase-progress-range-template", { includeHiddenElements: true }), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });
  }

  it("桁数の違う行でも、範囲欄は最長の表示「999 → 999 / 目標999」の幅を共通の最小幅にして右揃えにする", () => {
    render(<PhraseProgressList items={[wide, narrow]} />);
    layoutTemplate(140.4);

    const ranges = screen.getAllByTestId("phrase-progress-range");
    expect(ranges).toHaveLength(2);
    for (const range of ranges) {
      const style = StyleSheet.flatten(range.props.style);
      expect(style.minWidth).toBe(141);
      expect(style.textAlign).toBe("right");
    }
    expect(screen.getByTestId("phrase-progress-range-template", { includeHiddenElements: true })).toHaveTextContent(
      "999 → 999 / 目標999",
    );
  });

  it("幅の基準は行と同じ文字サイズの拡大上限を持ち、読み上げには出さない", () => {
    render(<PhraseProgressList items={[narrow]} />);
    const template = screen.getByTestId("phrase-progress-range-template", { includeHiddenElements: true });
    const range = screen.getByTestId("phrase-progress-range");

    expect(template.props.maxFontSizeMultiplier).toBe(range.props.maxFontSizeMultiplier);
    expect(range.props.maxFontSizeMultiplier).toBe(1.3);
    expect(StyleSheet.flatten(template.props.style)).toEqual(
      StyleSheet.flatten([range.props.style, { minWidth: undefined }]),
    );
    expect(screen.queryByText("999 → 999 / 目標999")).toBeNull();
  });
});
