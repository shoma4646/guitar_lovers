import { act, render, screen } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeScreen } from "../PracticeScreen";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/practice/components/PracticeTab", () => ({
  PracticeTab: () => {
    const { Text: MockText } = jest.requireActual("react-native");
    return <MockText testID="mock-practice-tab">practice</MockText>;
  },
}));
jest.mock("@/features/practice/components/PresetsTab", () => ({
  PresetsTab: () => {
    const { Text: MockText } = jest.requireActual("react-native");
    return <MockText testID="mock-presets-tab">presets</MockText>;
  },
}));
jest.mock("@/features/practice/components/FavoritesTab", () => ({
  FavoritesTab: () => {
    const { Text: MockText } = jest.requireActual("react-native");
    return <MockText testID="mock-favorites-tab">favorites</MockText>;
  },
}));
jest.mock("@/features/practice/components/AddVideoSheet", () => ({ AddVideoSheet: () => null }));

const phrase: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "フレーズ",
  startSec: 10,
  endSec: 20,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
});

describe("メニュー集・お気に入りを開いたまま別の画面から練習を始めたとき", () => {
  it.each(["presets", "favorites"] as const)("%sの一覧ではなく練習タブを描画する", (subTab) => {
    usePracticeStore.getState().setPracticeSubTab(subTab);
    render(<PracticeScreen />);

    act(() => {
      usePracticeStore.getState().startPhrasePractice(phrase, 85);
    });

    expect(screen.getByTestId("mock-practice-tab")).toBeTruthy();
    expect(screen.queryByTestId("mock-presets-tab")).toBeNull();
    expect(screen.queryByTestId("mock-favorites-tab")).toBeNull();
  });
});
