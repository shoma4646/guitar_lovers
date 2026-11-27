import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { semantic } from "@/shared/theme/semantic";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { TodayPhraseRows } from "../TodayPhraseRows";
import { AllPhrasesSheet } from "../AllPhrasesSheet";
import { PracticeMenuSheet } from "../PracticeMenuSheet";

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
  makePhrase("p1", "未練習", 100, 240),
  makePhrase("p2", "今日完了", 100, 240),
  makePhrase("p3", "もう一本", 100, 240),
  makePhrase("p4", "卒業フレーズ", 140, 140),
];

const mockAttempts: PhraseAttempt[] = [
  { id: "a1", phraseId: "p1", date: yesterday, bpm: 100, result: "ok" },
  { id: "a2", phraseId: "p2", date: yesterday, bpm: 100, result: "ok" },
  { id: "a3", phraseId: "p2", date: now.toISOString(), bpm: 200, result: "ok" },
  { id: "a4", phraseId: "p3", date: yesterday, bpm: 100, result: "ng" },
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

function renderTodayRows() {
  return render(<TodayPhraseRows onStartPhrase={jest.fn()} onOpenAllPhrases={jest.fn()} />);
}

function renderAllPhrasesSheet() {
  return render(<AllPhrasesSheet visible onClose={jest.fn()} onStartPhrase={jest.fn()} />);
}

function renderMenuSheet(activePhraseId: string | null = null) {
  return render(
    <PracticeMenuSheet
      visible
      onClose={jest.fn()}
      activePhraseId={activePhraseId}
      onSelectPhrase={jest.fn()}
      metronomeBpm={80}
      metronomeEnabled
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
      videoDuration={0}
      onAddBookmark={jest.fn()}
      onRemoveBookmark={jest.fn()}
      onOpenAddVideo={jest.fn()}
      onCloseVideo={jest.fn()}
      onSeekBookmark={jest.fn()}
    />,
  );
}

const sheets = [
  ["すべてのフレーズ", renderAllPhrasesSheet],
  ["メニューと道具", () => renderMenuSheet()],
] as const;

function rowOf(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^${name}、`) });
}

describe.each(sheets)("%sシートの行の今日完了の表示", (_, renderSheet) => {
  it("今日okの記録で目標に届いたフレーズの行は「今日完了」を出し、「現在 → 目標」は出さない", () => {
    renderSheet();
    const row = rowOf("今日完了");

    expect(within(row).getByText(/^200 今日完了$/)).toBeTruthy();
    expect(within(row).queryByText(/→/)).toBeNull();
  });

  it("今日まだ弾いていないフレーズの行は従来どおり「現在 → 今日の目標」を出す", () => {
    renderSheet();
    const row = rowOf("未練習");

    expect(within(row).getByText(/^\d+ → \d+$/)).toBeTruthy();
    expect(within(row).queryByText(/今日完了/)).toBeNull();
  });

  it("行は高さを固定せず最低56ptを保つ", () => {
    renderSheet();
    const style = StyleSheet.flatten(rowOf("未練習").props.style);

    expect(style.minHeight).toBe(56);
    expect(style.height).toBeUndefined();
  });

  it("卒業の接頭辞は卒業の意味色で描く", () => {
    renderSheet();
    const prefix = within(rowOf("卒業済み")).getByText("卒業・");

    expect(StyleSheet.flatten(prefix.props.style).color).toBe(semantic.graduated);
  });
});

function textStyleOf(row: ReturnType<typeof rowOf>, testID: string) {
  const style = StyleSheet.flatten(within(row).getByTestId(testID).props.style);
  return { fontSize: style.fontSize, fontWeight: style.fontWeight, color: style.color };
}

describe("3か所の行の見た目の一致", () => {
  const places = [
    ["今日タブ", renderTodayRows],
    ...sheets,
  ] as const;

  it.each(["未練習", "今日完了"])("「%s」の行の名前とBPMの文字の大きさ・太さ・色が3か所で同じ", (name) => {
    const styles = places.map(([, renderPlace]) => {
      const view = renderPlace();
      const row = rowOf(name);
      const result = {
        name: textStyleOf(row, "phrase-menu-row-name"),
        bpm: textStyleOf(row, "phrase-menu-row-bpm"),
      };
      view.unmount();
      return result;
    });

    expect(styles[1]).toEqual(styles[0]);
    expect(styles[2]).toEqual(styles[0]);
  });
});

describe("メニューと道具シートの練習中の行", () => {
  it("練習中で未完了の行は、完了のチェックを出さずに練習中であることを示す", () => {
    renderMenuSheet("p1");
    const row = rowOf("未練習");

    expect(within(row).queryByText(/今日完了/)).toBeNull();
    expect(within(row).getByTestId("phrase-menu-row-active-icon")).toBeTruthy();
  });
});
