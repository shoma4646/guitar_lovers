import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { AddVideoSheet } from "../AddVideoSheet";
import { SavePhraseSheet } from "../SavePhraseSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({ data: [] }),
}));
jest.mock("expo-clipboard", () => ({
  isPasteButtonAvailable: false,
  getStringAsync: () => Promise.resolve(""),
}));

function expectGrowsWithFontScale(label: string) {
  const input = screen.getByLabelText(label);
  const style = StyleSheet.flatten(input.props.style);
  expect(style.height).toBeUndefined();
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
  expect(input.props.maxFontSizeMultiplier).toBeGreaterThan(1);
}

describe("大きな文字サイズで入力中の文字が切れない", () => {
  it.each(["フレーズ名入力", "現在BPM入力", "目標BPM入力"])(
    "フレーズとして保存の「%s」は高さを固定せず44pt以上で、拡大に上限がある",
    (label) => {
      render(<SavePhraseSheet visible onClose={jest.fn()} defaultBpm={80} onSave={jest.fn()} />);

      expectGrowsWithFontScale(label);
    },
  );

  it("動画を追加のURL欄は高さを固定せず44pt以上で、拡大に上限があり、横幅いっぱいに伸びる", () => {
    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expectGrowsWithFontScale("YouTube URL入力");
    expect(StyleSheet.flatten(screen.getByLabelText("YouTube URL入力").props.style).flex).toBe(1);
  });
});
