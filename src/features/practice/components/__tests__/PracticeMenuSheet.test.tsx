import { fireEvent, render, screen } from "@testing-library/react-native";
import type { Bookmark } from "@/shared/types/models";
import { PracticeMenuSheet } from "../PracticeMenuSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));

function renderSheet(isSavingSession: boolean, overrides: Partial<React.ComponentProps<typeof PracticeMenuSheet>> = {}) {
  return render(
    <PracticeMenuSheet
      visible
      onClose={jest.fn()}
      activePhraseId={null}
      onSelectPhrase={jest.fn()}
      metronomeBpm={80}
      metronomeEnabled={false}
      metronomeActiveBeat={-1}
      metronomeBeatsPerBar={4}
      onStepMetronomeBpm={jest.fn()}
      onToggleMetronome={jest.fn()}
      displaySeconds={900}
      isTimerRunning={false}
      onToggleTimer={jest.fn()}
      onSaveSession={jest.fn()}
      isSavingSession={isSavingSession}
      hasVideo={false}
      bookmarks={[]}
      onAddBookmark={jest.fn()}
      onRemoveBookmark={jest.fn()}
      onOpenAddVideo={jest.fn()}
      onCloseVideo={jest.fn()}
      onSeekBookmark={jest.fn()}
      {...overrides}
    />,
  );
}

describe("PracticeMenuSheet の記録ボタン", () => {
  it("保存中は「記録」ボタンが disabled になる", () => {
    renderSheet(true);
    expect(screen.getByRole("button", { name: "記録" })).toBeDisabled();
  });

  it("保存中でなければ押せる", () => {
    renderSheet(false);
    expect(screen.getByRole("button", { name: "記録" })).toBeEnabled();
  });
});

describe("PracticeMenuSheet のブックマーク", () => {
  const bookmark: Bookmark = {
    id: "bm1",
    time: 83,
    label: "ブックマーク 1",
    createdAt: "2026-10-01T00:00:00.000Z",
  };

  function setupBookmarks() {
    const onSeekBookmark = jest.fn();
    const onRemoveBookmark = jest.fn();
    const onClose = jest.fn();
    renderSheet(false, { hasVideo: true, bookmarks: [bookmark], onSeekBookmark, onRemoveBookmark, onClose });
    return { onSeekBookmark, onRemoveBookmark, onClose };
  }

  it("行を押すとその位置へ移動し、シートを閉じる", () => {
    const { onSeekBookmark, onRemoveBookmark, onClose } = setupBookmarks();

    fireEvent.press(screen.getByRole("button", { name: /1:23へ移動/ }));

    expect(onSeekBookmark).toHaveBeenCalledTimes(1);
    expect(onSeekBookmark).toHaveBeenCalledWith(83);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRemoveBookmark).not.toHaveBeenCalled();
  });

  it("×を押したときは削除だけが呼ばれ、移動しない", () => {
    const { onSeekBookmark, onRemoveBookmark, onClose } = setupBookmarks();

    fireEvent.press(screen.getByRole("button", { name: "ブックマークを削除" }));

    expect(onRemoveBookmark).toHaveBeenCalledWith("bm1");
    expect(onSeekBookmark).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("行のタップ領域の高さは44以上", () => {
    setupBookmarks();
    const row = screen.getByRole("button", { name: /1:23へ移動/ });
    expect(row).toHaveStyle({ height: 44 });
  });
});
