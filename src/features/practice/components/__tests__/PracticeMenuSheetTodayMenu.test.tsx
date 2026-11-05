import { render } from "@testing-library/react-native";
import { buildTodayMenu } from "@/features/practice/lib/progression";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { PracticeMenuSheet } from "../PracticeMenuSheet";

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロ",
  startSec: 10,
  endSec: 20,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockPhrases = [PHRASE];
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases }),
}));
const mockAttempts: PhraseAttempt[] = [];
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts }),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));
jest.mock("@/features/practice/lib/progression", () => {
  const actual = jest.requireActual<typeof import("@/features/practice/lib/progression")>(
    "@/features/practice/lib/progression",
  );
  return { ...actual, buildTodayMenu: jest.fn(actual.buildTodayMenu) };
});

function sheet(visible: boolean, displaySeconds: number) {
  return (
    <PracticeMenuSheet
      visible={visible}
      onClose={jest.fn()}
      activePhraseId={null}
      onSelectPhrase={jest.fn()}
      metronomeBpm={80}
      metronomeEnabled
      metronomeBeatsPerBar={4}
      onStepMetronomeBpm={jest.fn()}
      onToggleMetronome={jest.fn()}
      displaySeconds={displaySeconds}
      isTimerRunning
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
    />
  );
}

beforeEach(() => {
  (buildTodayMenu as jest.Mock).mockClear();
});

describe("PracticeMenuSheet の今日のメニューの計算", () => {
  it("閉じている間はタイマーが進んで描き直されても今日のメニューを計算しない", () => {
    const { rerender } = render(sheet(false, 0));
    rerender(sheet(false, 1));
    rerender(sheet(false, 2));

    expect(buildTodayMenu).not.toHaveBeenCalled();
  });

  it("開いている間もタイマーの1秒ごとには計算し直さない", () => {
    const { rerender, getByText } = render(sheet(true, 0));
    rerender(sheet(true, 1));
    rerender(sheet(true, 2));

    expect(buildTodayMenu).toHaveBeenCalledTimes(1);
    expect(getByText("イントロ")).toBeTruthy();
  });
});
