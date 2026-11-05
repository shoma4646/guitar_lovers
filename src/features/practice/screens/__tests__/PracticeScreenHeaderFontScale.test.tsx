import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { usePracticeStore } from "@/stores/practice";
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
jest.mock("@/features/practice/components/PracticeTab", () => ({ PracticeTab: () => null }));
jest.mock("@/features/practice/components/PresetsTab", () => ({ PresetsTab: () => null }));
jest.mock("@/features/practice/components/FavoritesTab", () => ({ FavoritesTab: () => null }));
jest.mock("@/features/practice/components/AddVideoSheet", () => ({ AddVideoSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
});

describe("PracticeScreen の日付ヘッダー（文字サイズを大きくしたとき）", () => {
  it("高さを固定せず最小52で確保し、文字が増えた分だけ枠が伸びる", () => {
    render(<PracticeScreen />);

    const style = StyleSheet.flatten(screen.getByTestId("practice-date-header").props.style);
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(52);
  });

  it("日付とタイトルの拡大率に上限を付ける", () => {
    render(<PracticeScreen />);

    expect(screen.getByText(/^\d+月\d+日（.）$/).props.maxFontSizeMultiplier).toBe(1.3);
    expect(screen.getByText("今日の練習").props.maxFontSizeMultiplier).toBe(1.3);
  });
});
