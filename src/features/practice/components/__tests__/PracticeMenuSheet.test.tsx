import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { Bookmark } from "@/shared/types/models";
import { countNestedVerticalScrolls, isInsideVerticalScroll } from "@/shared/testing/sheetScroll";
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
      videoDuration={0}
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

  it("1時間以上の動画では、1時間未満のブックマークも時の桁付きで表示し、読み上げも揃える", () => {
    renderSheet(false, { hasVideo: true, bookmarks: [{ ...bookmark, label: undefined }], videoDuration: 4500 });
    expect(screen.getAllByText("0:01:23")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "0:01:23、0:01:23へ移動" })).toBeTruthy();
  });

  it("練習タイマーは60分を超えると時:分:秒で表示する", () => {
    renderSheet(false, { displaySeconds: 4500 });
    expect(screen.getByText("1:15:00")).toBeTruthy();
  });

  it("行のタップ領域の高さは44以上", () => {
    setupBookmarks();
    const row = screen.getByRole("button", { name: /1:23へ移動/ });
    expect(row).toHaveStyle({ height: 44 });
  });
});

describe("PracticeMenuSheet のスクロール領域", () => {
  it("固定の高さ上限を持たず、シートの残りの高さに合わせて縮む", () => {
    renderSheet(false);
    const scroll = StyleSheet.flatten(screen.getByTestId("practice-menu-scroll").props.style);
    expect(scroll.maxHeight).toBeUndefined();
    expect(scroll.flexShrink).toBe(1);
  });
});

describe("PracticeMenuSheet の見出し", () => {
  it("シートのタイトルと4つのセクション名だけが見出しとして読まれる", () => {
    renderSheet(false, { hasVideo: true });

    expect(screen.getByRole("header", { name: "メトロノーム" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "練習タイマー" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "今日のメニュー" })).toBeTruthy();
    expect(screen.getByRole("header", { name: /^ブックマーク/ })).toBeTruthy();
    expect(screen.getAllByRole("header")).toHaveLength(5);
  });
});

describe("PracticeMenuSheet のスクロール", () => {
  it("中身は自前のスクロール1つの中に描き、シートのスクロールと二重にしない", () => {
    renderSheet(false);

    expect(isInsideVerticalScroll(screen.getByRole("button", { name: "記録" }))).toBe(true);
    expect(countNestedVerticalScrolls()).toBe(0);
  });
});
