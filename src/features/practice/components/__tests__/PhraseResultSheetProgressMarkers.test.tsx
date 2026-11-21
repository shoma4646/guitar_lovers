import { StyleSheet } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { PracticePhrase } from "@/shared/types/models";
import type { PhraseProgressSummary } from "@/features/progress/lib/phraseProgress";
import { PhraseResultSheet } from "../PhraseResultSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const phrase: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "動画",
  name: "イントロ",
  startSec: 0,
  endSec: 10,
  currentBpm: 115,
  targetBpm: 180,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const TRACK_WIDTH = 250;

function renderSheet(bpm: number, { startBpm = 80, currentBpm = 115, targetBpm = 180 } = {}) {
  const progress: PhraseProgressSummary = {
    phrase,
    startBpm,
    currentBpm,
    targetBpm,
    progressRatio: (currentBpm - startBpm) / (targetBpm - startBpm),
    gainBpm: Math.max(0, currentBpm - startBpm),
    graduatedAt: undefined,
  };
  render(
    <PhraseResultSheet
      visible
      phrase={phrase}
      bpm={bpm}
      progress={progress}
      phraseElapsedSeconds={60}
      completedReps={2}
      onChangeCompletedReps={jest.fn()}
      hasNextPhrase={false}
      isSubmitting={false}
      onClose={jest.fn()}
      onSubmit={jest.fn()}
    />,
  );
}

function layoutTrack(width = TRACK_WIDTH) {
  fireEvent(screen.getByTestId("phrase-result-progress-track"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } },
  });
}

function markerStyle(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

describe("PhraseResultSheet の進捗バーの目盛り", () => {
  it("開始・卒業はバーの両端に出し、今日・前回はマーカーとして出す", () => {
    renderSheet(112);
    layoutTrack();

    expect(screen.getByText("開始 80")).toBeTruthy();
    expect(screen.getByText("卒業 180")).toBeTruthy();
    expect(screen.getByTestId("phrase-result-today-marker")).toHaveTextContent("今日 112");
    expect(screen.getByTestId("phrase-result-previous-marker")).toHaveTextContent("前回 115");
  });

  it("今日のマーカーは塗りの終端（幅×0.32）に、前回より低い日は前回のマーカーが今日より右に出る", () => {
    renderSheet(112);
    layoutTrack();

    expect(markerStyle("phrase-result-today-marker").left).toBeCloseTo(TRACK_WIDTH * 0.32);
    expect(markerStyle("phrase-result-today-tick").left).toBeCloseTo(TRACK_WIDTH * 0.32 - 1);
    expect(markerStyle("phrase-result-previous-tick").left).toBeCloseTo(TRACK_WIDTH * 0.35 - 1);
    expect(markerStyle("phrase-result-previous-tick").left).toBeGreaterThan(
      markerStyle("phrase-result-today-tick").left as number,
    );
  });

  it("バーの幅が分かるまではマーカーを出さない", () => {
    renderSheet(112);

    expect(screen.queryByTestId("phrase-result-today-marker")).toBeNull();
    expect(screen.queryByTestId("phrase-result-previous-marker")).toBeNull();
  });

  it("今日が開始と同じとき、マーカーは左端から右へ伸ばしバーの外に出さない", () => {
    renderSheet(80);
    layoutTrack();

    const label = markerStyle("phrase-result-today-marker");
    expect(label.left).toBe(0);
    expect(label.right).toBeUndefined();
    expect(label.alignSelf).toBe("flex-start");
    expect(markerStyle("phrase-result-today-tick").left).toBe(0);
  });

  it.each([180, 200])("今日が卒業以上（%i）のとき、マーカーは右端から左へ伸ばしバーの外に出さない", (bpm) => {
    renderSheet(bpm);
    layoutTrack();

    const label = markerStyle("phrase-result-today-marker");
    expect(label.right).toBe(0);
    expect(label.left).toBeUndefined();
    expect(label.alignSelf).toBe("flex-end");
    expect(markerStyle("phrase-result-today-tick").left).toBe(TRACK_WIDTH - 2);
  });

  it("前回が開始より低いときも前回のマーカーは左端に留める", () => {
    renderSheet(112, { startBpm: 120, currentBpm: 100, targetBpm: 180 });
    layoutTrack();

    expect(markerStyle("phrase-result-previous-marker").left).toBe(0);
    expect(markerStyle("phrase-result-previous-tick").left).toBe(0);
  });
});
