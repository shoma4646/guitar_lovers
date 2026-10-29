import { render, screen } from "@testing-library/react-native";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { TodayPhraseRows } from "../TodayPhraseRows";
import { AllPhrasesSheet } from "../AllPhrasesSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

function makePhrase(id: string, name: string, currentBpm: number, targetBpm: number): PracticePhrase {
  return {
    id,
    videoId: "abc123def45",
    videoTitle: "動画",
    name,
    startSec: 0,
    endSec: 10,
    currentBpm,
    targetBpm,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const mockPhrases: PracticePhrase[] = [
  makePhrase("p1", "一本目", 100, 240),
  makePhrase("p2", "二本目", 100, 240),
  makePhrase("p3", "三本目", 100, 240),
  makePhrase("p4", "卒業フレーズ", 140, 140),
];

const mockAttempts: PhraseAttempt[] = [
  { id: "a1", phraseId: "p1", date: yesterday, bpm: 100, result: "ng" },
  { id: "a2", phraseId: "p2", date: yesterday, bpm: 100, result: "ok" },
  { id: "a3", phraseId: "p2", date: now.toISOString(), bpm: 200, result: "ok" },
  { id: "a4", phraseId: "p3", date: yesterday, bpm: 100, result: "ok" },
];

jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases, isLoading: false }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts, isLoading: false }),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));

describe("今日のフレーズ行の読み上げ", () => {
  it("未完了の行のラベルに前回BPMと今日の目標BPMの数値が含まれる", () => {
    render(<TodayPhraseRows onStartPhrase={jest.fn()} onOpenAllPhrases={jest.fn()} />);
    const row = screen.getByRole("button", { name: /^三本目、/ });
    expect(row.props.accessibilityLabel).toMatch(/^三本目、前回\d+、今日の目標\d+BPM$/);
    expect(row.props.accessibilityHint).toContain("練習を開始");
  });

  it("今日完了の行のラベルに「今日完了」が含まれる", () => {
    render(<TodayPhraseRows onStartPhrase={jest.fn()} onOpenAllPhrases={jest.fn()} />);
    const row = screen.getByRole("button", { name: /^二本目、/ });
    expect(row.props.accessibilityLabel).toContain("今日完了200BPM");
  });
});

describe("全件シートの読み上げ", () => {
  it("卒業済みの行のラベルに「卒業」が含まれ、未卒業の行には含まれない", () => {
    render(<AllPhrasesSheet visible onClose={jest.fn()} onStartPhrase={jest.fn()} />);
    expect(screen.getByRole("button", { name: /卒業済み、卒業フレーズ/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^三本目、前回\d+、今日の目標\d+BPM/ })).toBeTruthy();
  });
});
