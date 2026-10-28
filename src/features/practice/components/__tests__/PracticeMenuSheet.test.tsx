import { render, screen } from "@testing-library/react-native";
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

function renderSheet(isSavingSession: boolean) {
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
