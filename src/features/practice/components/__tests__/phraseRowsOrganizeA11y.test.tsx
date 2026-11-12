import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { TodayPhraseRows } from "../TodayPhraseRows";
import { AllPhrasesSheet } from "../AllPhrasesSheet";
import { PracticeMenuSheet } from "../PracticeMenuSheet";
import { TodayPickCard } from "../TodayPickCard";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const yesterday = new Date(Date.now() - DAY_MS).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS).toISOString();

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
  makePhrase("p0", "今日の1本", 100, 240),
  makePhrase("p1", "一本目", 100, 240),
  makePhrase("p2", "卒業フレーズ", 140, 140),
];
const mockAttempts: PhraseAttempt[] = [
  { id: "a0", phraseId: "p0", date: twoDaysAgo, bpm: 100, result: "ng" },
  { id: "a1", phraseId: "p1", date: yesterday, bpm: 100, result: "ng" },
];

jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases, isLoading: false }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts, isLoading: false }),
}));
jest.mock("@/features/practice/api/useArchivePracticePhrase", () => ({
  useArchivePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useDeletePracticePhrase", () => ({
  useDeletePracticePhrase: () => ({ mutate: jest.fn() }),
}));

function renderMenuSheet() {
  return render(
    <PracticeMenuSheet
      visible
      onClose={jest.fn()}
      activePhraseId={null}
      onSelectPhrase={jest.fn()}
      metronomeBpm={80}
      metronomeEnabled={false}
      metronomeBeatsPerBar={4}
      onStepMetronomeBpm={jest.fn()}
      onToggleMetronome={jest.fn()}
      displaySeconds={0}
      isTimerRunning={false}
      onToggleTimer={jest.fn()}
      onSaveSession={jest.fn()}
      isSavingSession={false}
      hasVideo={false}
      bookmarks={[]}
      onAddBookmark={jest.fn()}
      onRemoveBookmark={jest.fn()}
      onOpenAddVideo={jest.fn()}
      onCloseVideo={jest.fn()}
      onSeekBookmark={jest.fn()}
    />,
  );
}

const placements = [
  ["今日のフレーズ行", () => render(<TodayPhraseRows onStartPhrase={jest.fn()} onOpenAllPhrases={jest.fn()} />)],
  ["全件シート", () => render(<AllPhrasesSheet visible onClose={jest.fn()} onStartPhrase={jest.fn()} />)],
  ["メニュー集", renderMenuSheet],
] as const;

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe.each(placements)("%sの読み上げ用アクション", (_label, renderRows) => {
  function row() {
    return screen.getByRole("button", { name: /^一本目、/ });
  }

  it("アーカイブと削除のアクションを持つ", () => {
    renderRows();
    expect(row().props.accessibilityActions).toEqual([
      { name: "archive", label: "アーカイブ" },
      { name: "delete", label: "削除" },
    ]);
  });

  it("deleteアクションで削除の確認ダイアログが出る", () => {
    renderRows();
    fireEvent(row(), "accessibilityAction", { nativeEvent: { actionName: "delete" } });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe("削除の確認");
  });

  it("archiveアクションでアーカイブの確認ダイアログが出る", () => {
    renderRows();
    fireEvent(row(), "accessibilityAction", { nativeEvent: { actionName: "archive" } });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe("アーカイブの確認");
  });

  it("関係のないアクション名では何も出ない", () => {
    renderRows();
    fireEvent(row(), "accessibilityAction", { nativeEvent: { actionName: "activate" } });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("長押しでは従来どおり整理メニューが出て、選ぶと確認ダイアログに進む", () => {
    renderRows();
    fireEvent(row(), "longPress");

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe("一本目");
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "削除")?.onPress?.();
    expect(alertSpy.mock.calls[1][0]).toBe("削除の確認");
  });
});

describe("メニュー集の行の読み上げ", () => {
  it("BPMを含み、卒業済みの行には「卒業」が含まれる", () => {
    renderMenuSheet();
    expect(screen.getByRole("button", { name: /^一本目、前回100、今日の目標100BPM$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^卒業済み、卒業フレーズ、前回140/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^一本目、/ }).props.accessibilityHint).toContain(
      "練習を開始",
    );
  });
});

describe("今日の1本カードの整理", () => {
  function renderTodayPick() {
    render(<TodayPickCard onStartPhrase={jest.fn()} onTryPreset={jest.fn()} onOpenAddVideo={jest.fn()} />);
  }
  function startButton() {
    return screen.getByRole("button", { name: "この1本から始める" });
  }

  it("カードを長押しすると整理メニューが出て、選ぶと確認ダイアログに進む", () => {
    renderTodayPick();
    fireEvent(screen.getByTestId("today-pick-card"), "longPress");

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe("今日の1本");
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "アーカイブ")?.onPress?.();
    expect(alertSpy.mock.calls[1][0]).toBe("アーカイブの確認");
  });

  it("開始ボタンの長押しでも整理メニューが出る", () => {
    renderTodayPick();
    fireEvent(startButton(), "longPress");

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe("今日の1本");
  });

  it("開始ボタンはアーカイブと削除の読み上げ用アクションを持ち、それぞれの確認が出る", () => {
    renderTodayPick();
    expect(startButton().props.accessibilityActions).toEqual([
      { name: "archive", label: "アーカイブ" },
      { name: "delete", label: "削除" },
    ]);

    fireEvent(startButton(), "accessibilityAction", { nativeEvent: { actionName: "archive" } });
    fireEvent(startButton(), "accessibilityAction", { nativeEvent: { actionName: "delete" } });

    expect(alertSpy.mock.calls.map((call) => call[0])).toEqual(["アーカイブの確認", "削除の確認"]);
  });
});
