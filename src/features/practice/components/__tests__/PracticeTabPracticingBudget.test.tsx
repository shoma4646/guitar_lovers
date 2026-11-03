import { act, render, screen, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";
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
let mockPlayerMountCount = 0;
jest.mock("../VideoPlayerCard", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: () => {
      useEffect(() => {
        mockPlayerMountCount += 1;
      }, []);
      return null;
    },
  };
});
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
  mockPlayerMountCount = 0;
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
    expect(scroll.props.scrollEnabled).toBe(true);
    expect(within(scroll).getByRole("button", { name: "メニューを開く" })).toBeTruthy();
    expect(within(scroll).queryByTestId("practice-session-bar")).toBeNull();
    expect(screen.getByTestId("practice-session-bar")).toBeTruthy();
  });

  it("同じ端末でも練習中でなく動画を開いているだけなら、今までどおり上側をスクロールさせない", () => {
    act(() => {
      usePracticeStore.getState().loadVideo(PHRASE.videoId, PHRASE.videoTitle);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    expect(screen.getByRole("button", { name: "メニューを開く" })).toBeTruthy();
    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(false);
    expect(screen.queryByTestId("practice-session-bar")).toBeNull();
  });

  it("Pro Max 相当（高さ932）の練習中は、今までどおり上側をスクロールさせない", () => {
    mockWindow.height = 932;
    startPractice();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(false);
    expect(screen.getByTestId("practice-session-bar")).toBeTruthy();
  });

  it("高さ852で準備済みの動画のまま練習を始めて終えても、動画プレイヤーは作り直されない", () => {
    act(() => {
      usePracticeStore.getState().loadVideo(PHRASE.videoId, PHRASE.videoTitle);
      usePracticeStore.getState().setDuration(120);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    expect(mockPlayerMountCount).toBe(1);

    startPractice();
    expect(mockPlayerMountCount).toBe(1);
    act(() => {
      usePracticeStore.getState().setActivePhrasePractice(null);
    });
    expect(mockPlayerMountCount).toBe(1);
  });
});

describe("PracticeTab の上側スクロールが無効に戻るときの位置", () => {
  let scrollToSpy: jest.SpyInstance;

  beforeEach(() => {
    scrollToSpy = jest.spyOn(ScrollView.prototype, "scrollTo");
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
  });

  it("高さ852で練習中にスクロールできる状態から練習を終えると、上側を先頭へアニメーションなしで戻す", () => {
    startPractice();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(true);
    scrollToSpy.mockClear();

    act(() => {
      usePracticeStore.getState().setActivePhrasePractice(null);
    });

    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(false);
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  it("スクロールできる状態のまま再描画されても、スクロール位置は動かさない", () => {
    startPractice();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    scrollToSpy.mockClear();

    act(() => {
      usePracticeStore.getState().incrementCompletedReps();
    });

    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(true);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("Pro Max 相当（高さ932）で練習を始めて終えるなど、スクロールできない状態のままならスクロール位置は動かさない", () => {
    mockWindow.height = 932;
    startPractice();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    scrollToSpy.mockClear();

    act(() => {
      usePracticeStore.getState().setActivePhrasePractice(null);
    });

    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(false);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("練習を始めてスクロールできる状態になるときは、スクロール位置は動かさない", () => {
    act(() => {
      usePracticeStore.getState().loadVideo(PHRASE.videoId, PHRASE.videoTitle);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    scrollToSpy.mockClear();

    startPractice();

    expect(screen.getByTestId("practice-overflow-scroll").props.scrollEnabled).toBe(true);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
