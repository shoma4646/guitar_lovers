import { act, render } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeScreen } from "../PracticeScreen";

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

const mockScreenFrame = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: (props: { children: React.ReactNode; paddingBottom?: number }) => {
    mockScreenFrame(props);
    return props.children;
  },
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/practice/components/PracticeTab", () => ({ PracticeTab: () => null }));
jest.mock("@/features/practice/components/PresetsTab", () => ({ PresetsTab: () => null }));
jest.mock("@/features/practice/components/FavoritesTab", () => ({ FavoritesTab: () => null }));
jest.mock("@/features/practice/components/AddVideoSheet", () => ({ AddVideoSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockScreenFrame.mockClear();
});

function lastPaddingBottom(): number | undefined {
  return mockScreenFrame.mock.calls.at(-1)?.[0].paddingBottom;
}

describe("PracticeScreen の練習中バーとタブバーの隙間", () => {
  it("練習中はScreenFrameの下余白を0にし、練習中バーをタブバーに接させる", () => {
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
    });
    render(<PracticeScreen />);

    expect(lastPaddingBottom()).toBe(0);
  });

  it("動画を開いているだけで練習していないときは、従来どおりの下余白にする", () => {
    act(() => {
      usePracticeStore.getState().loadVideo(PHRASE.videoId, PHRASE.videoTitle);
    });
    render(<PracticeScreen />);

    expect(lastPaddingBottom()).toBeUndefined();
  });

  it("練習を終えると従来どおりの下余白に戻る", () => {
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
    });
    render(<PracticeScreen />);
    act(() => {
      usePracticeStore.getState().setActivePhrasePractice(null);
    });

    expect(lastPaddingBottom()).toBeUndefined();
  });
});
