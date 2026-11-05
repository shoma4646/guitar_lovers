import { fireEvent, render, screen } from "@testing-library/react-native";
import { PracticeMenuSheet } from "../PracticeMenuSheet";
import { AllPhrasesSheet } from "../AllPhrasesSheet";
import { FavoritesTab } from "../FavoritesTab";

type MockQuery = { data: unknown; isError: boolean; refetch: jest.Mock };
const failed = (): MockQuery => ({ data: undefined, isError: true, refetch: jest.fn() });
const loaded = (data: unknown[] = []): MockQuery => ({ data, isError: false, refetch: jest.fn() });

const mockQueries = {
  phrases: loaded(),
  attempts: loaded(),
  favorites: loaded(),
  recents: loaded(),
};

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => mockQueries.phrases,
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => mockQueries.attempts,
}));
jest.mock("@/features/practice/api/useFavoriteVideos", () => ({
  useFavoriteVideos: () => mockQueries.favorites,
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => mockQueries.recents,
}));
jest.mock("@/features/practice/api/useToggleFavoriteVideo", () => ({
  useToggleFavoriteVideo: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));

beforeEach(() => {
  mockQueries.phrases = loaded();
  mockQueries.attempts = loaded();
  mockQueries.favorites = loaded();
  mockQueries.recents = loaded();
});

function renderMenuSheet() {
  render(
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

function renderAllPhrasesSheet() {
  render(<AllPhrasesSheet visible onClose={jest.fn()} onStartPhrase={jest.fn()} />);
}

describe.each([
  ["PracticeMenuSheet", renderMenuSheet],
  ["AllPhrasesSheet", renderAllPhrasesSheet],
])("%s: フレーズや練習結果を読み出せないとき", (_name, renderSheet) => {
  it.each(["phrases", "attempts"] as const)(
    "%sの読み出しに失敗すると「まだありません」ではなくエラーを出し、再読み込みで取り直す",
    (key) => {
      mockQueries[key] = failed();

      renderSheet();

      expect(screen.queryByText("保存したフレーズはまだありません")).toBeNull();
      expect(screen.getByText(/読み込めませんでした/)).toBeTruthy();
      fireEvent.press(screen.getByRole("button", { name: "再読み込み" }));
      expect(mockQueries[key].refetch).toHaveBeenCalled();
    },
  );

  it("読み出せていれば、0件のときは従来どおり「まだありません」を出す", () => {
    renderSheet();

    expect(screen.getByText("保存したフレーズはまだありません")).toBeTruthy();
    expect(screen.queryByText(/読み込めませんでした/)).toBeNull();
  });
});

describe("AllPhrasesSheet の見出し", () => {
  it("読み出しに失敗したときは本数を「0本」と出さない", () => {
    mockQueries.phrases = failed();

    renderAllPhrasesSheet();

    expect(screen.queryByText(/0本/)).toBeNull();
  });
});

describe("FavoritesTab: 読み出せないとき", () => {
  it("お気に入りの読み出しに失敗すると「お気に入りはありません」ではなくエラーを出し、再読み込みで取り直す", () => {
    mockQueries.favorites = failed();

    render(<FavoritesTab />);

    expect(screen.queryByText("お気に入りはありません")).toBeNull();
    expect(screen.getByText(/お気に入りを読み込めませんでした/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "再読み込み" }));
    expect(mockQueries.favorites.refetch).toHaveBeenCalled();
  });

  it("最近の動画の読み出しに失敗すると「最近視聴した動画はありません」ではなくエラーを出す", () => {
    mockQueries.recents = failed();

    render(<FavoritesTab />);

    expect(screen.queryByText("最近視聴した動画はありません")).toBeNull();
    expect(screen.getByText(/最近見た動画を読み込めませんでした/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "再読み込み" }));
    expect(mockQueries.recents.refetch).toHaveBeenCalled();
  });
});
