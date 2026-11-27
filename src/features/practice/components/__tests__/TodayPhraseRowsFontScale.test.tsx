import { render, screen } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { TodayPhraseRows } from "../TodayPhraseRows";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

function makePhrase(id: string, name: string): PracticePhrase {
  return {
    id,
    videoId: "abc123def45",
    videoTitle: "動画",
    name,
    startSec: 0,
    endSec: 10,
    currentBpm: 100,
    targetBpm: 240,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const mockPhrases: PracticePhrase[] = [
  makePhrase("p1", "一本目"),
  makePhrase("p2", "二本目"),
  makePhrase("p3", "三本目"),
];

const attemptsWithoutToday: PhraseAttempt[] = [
  { id: "a1", phraseId: "p1", date: yesterday, bpm: 100, result: "ng" },
  { id: "a2", phraseId: "p2", date: yesterday, bpm: 100, result: "ok" },
  { id: "a3", phraseId: "p3", date: yesterday, bpm: 100, result: "ok" },
];
const attemptsWithTodayCompleted: PhraseAttempt[] = [
  ...attemptsWithoutToday,
  { id: "a4", phraseId: "p2", date: now.toISOString(), bpm: 200, result: "ok" },
];

let mockAttempts: PhraseAttempt[] = attemptsWithoutToday;

jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases, isLoading: false }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts, isLoading: false }),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));

function renderRows() {
  return render(<TodayPhraseRows onStartPhrase={jest.fn()} onOpenAllPhrases={jest.fn()} />);
}

beforeEach(() => {
  mockAttempts = attemptsWithoutToday;
});

describe("今日のフレーズの見出しの文字拡大への備え", () => {
  it("左の見出しは縮んで折り返せ、右の「長押しで整理」は縮まずに下の行へ回る", () => {
    renderRows();
    const container = StyleSheet.flatten(screen.getByTestId("today-phrases-heading").parent?.props.style);
    const heading = StyleSheet.flatten(screen.getByTestId("today-phrases-heading").props.style);
    const hint = StyleSheet.flatten(screen.getByText("長押しで整理").props.style);

    expect(container.flexWrap).toBe("wrap");
    expect(heading.flexShrink).toBe(1);
    expect(heading.flexWrap).toBe("wrap");
    expect(hint.flexShrink).toBe(0);
  });
});

describe("今日のフレーズの行の文字拡大への備え", () => {
  it("行は高さを固定せず、最低56ptを保って文字に合わせて伸びる", () => {
    renderRows();
    const row = screen.getByRole("button", { name: /^三本目、/ });
    const style = StyleSheet.flatten(row.props.style);

    expect(style.minHeight).toBe(56);
    expect(style.height).toBeUndefined();
  });

  it("未完了の行のBPMの数字に数字用の拡大上限がある", () => {
    renderRows();
    const bpms = screen.getAllByText(/^\d+ → \d+$/);

    expect(bpms).toHaveLength(2);
    bpms.forEach((bpm) => {
      expect(bpm.props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
    });
  });

  it("今日完了の行のBPMの数字に数字用の拡大上限がある", () => {
    mockAttempts = attemptsWithTodayCompleted;
    renderRows();
    const bpm = screen.getByText(/^200 今日完了$/);
    expect(bpm.props.maxFontSizeMultiplier).toBe(NUMERIC_MAX_FONT_SIZE_MULTIPLIER);
  });
});

describe("名前の左のチェック用の枠", () => {
  it("今日完了した行が無いときは、名前の左に20ptの空きを取らない", () => {
    renderRows();
    const checkSlots = screen
      .UNSAFE_getAllByType(View)
      .filter((view) => StyleSheet.flatten(view.props.style)?.width === 20);

    expect(checkSlots).toHaveLength(0);
  });

  it("今日完了した行があるときは、未完了の行にも20ptの枠を取って名前の位置を揃える", () => {
    mockAttempts = attemptsWithTodayCompleted;
    renderRows();
    const placeholders = screen.getAllByTestId("phrase-menu-row-leading-placeholder");

    expect(placeholders.length).toBeGreaterThan(0);
    placeholders.forEach((placeholder) => {
      expect(StyleSheet.flatten(placeholder.props.style).width).toBe(20);
    });
  });
});

describe("今日のフレーズの見出し", () => {
  it("見出しと進み具合をまとめて1つの見出しとして読み、「長押しで整理」は見出しにしない", () => {
    renderRows();

    expect(screen.getByRole("header", { name: /^今日のフレーズ/ })).toBe(screen.getByTestId("today-phrases-heading"));
    expect(screen.getAllByRole("header")).toHaveLength(1);
  });
});
