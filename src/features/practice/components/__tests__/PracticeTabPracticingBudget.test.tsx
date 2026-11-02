import { act, render, screen, within } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

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

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
const mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [PHRASE] }),
}));
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({ data: [] }),
}));
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/useSaveTimerSession", () => ({
  useSaveTimerSession: () => ({ saveTimerSession: jest.fn(), isSaving: false }),
}));
jest.mock("@/features/practice/hooks/useCloseVideo", () => ({ useCloseVideo: () => jest.fn() }));
jest.mock("@/features/practice/hooks/usePausePlayerOnBlur", () => ({ usePausePlayerOnBlur: () => {} }));
jest.mock("@/features/practice/hooks/useMetronomeEngine", () => ({
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, activeBeat: -1, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
jest.mock("../VideoPlayerCard", () => ({ VideoPlayerCard: () => null }));
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
jest.mock("../PracticeSessionBar", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { PracticeSessionBar: () => <View testID="practice-session-bar" /> };
});
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockWindow.height = 852;
});

function startPractice() {
  act(() => {
    usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
  });
}

describe("PracticeTab の練習中の高さ予算（標準の文字サイズ）", () => {
  it("iPhone 15 Pro 相当（高さ852・上下inset 59/34）の練習中は、上側だけをスクロールさせ練習中バーを下端に固定する", () => {
    startPractice();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    const scroll = screen.getByTestId("practice-overflow-scroll");
    expect(within(scroll).getByRole("button", { name: "メニューを開く" })).toBeTruthy();
    expect(within(scroll).queryByTestId("practice-session-bar")).toBeNull();
    expect(screen.getByTestId("practice-session-bar")).toBeTruthy();
  });

  it("同じ端末でも練習中でなく動画を開いているだけなら、今までどおりスクロール領域を作らない", () => {
    act(() => {
      usePracticeStore.getState().loadVideo(PHRASE.videoId, PHRASE.videoTitle);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    expect(screen.getByRole("button", { name: "メニューを開く" })).toBeTruthy();
    expect(screen.queryByTestId("practice-overflow-scroll")).toBeNull();
    expect(screen.queryByTestId("practice-session-bar")).toBeNull();
  });

  it("Pro Max 相当（高さ932）の練習中は、今までどおりスクロール領域を作らない", () => {
    mockWindow.height = 932;
    startPractice();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    expect(screen.queryByTestId("practice-overflow-scroll")).toBeNull();
    expect(screen.getByTestId("practice-session-bar")).toBeTruthy();
  });
});
