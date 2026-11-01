import { ScrollView, StyleSheet } from "react-native";
import { act, render, screen } from "@testing-library/react-native";
import { FavoritesTab } from "../FavoritesTab";

jest.mock("@/features/practice/api/useFavoriteVideos", () => ({
  useFavoriteVideos: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({
    data: [
      {
        videoId: "abc",
        title: "昨夜の動画",
        lastWatchedAt: new Date(2026, 9, 26, 23, 0).toISOString(),
      },
    ],
  }),
}));
jest.mock("@/features/practice/api/useToggleFavoriteVideo", () => ({
  useToggleFavoriteVideo: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => jest.fn(),
}));

describe("FavoritesTab の相対日付", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("開いたままローカル0:00をまたぐと「今日」が「昨日」に更新される", () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 26, 23, 30) });
    render(<FavoritesTab />);
    expect(screen.getByText("今日")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(31 * 60 * 1000);
    });
    expect(screen.getByText("昨日")).toBeTruthy();
    expect(screen.queryByText("今日")).toBeNull();
  });
});

describe("FavoritesTab の見た目", () => {
  it("横の余白は画面枠に任せ、ScrollView 側では付けない", () => {
    render(<FavoritesTab />);

    const contentStyle = StyleSheet.flatten(
      screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle,
    );
    expect(contentStyle.paddingHorizontal).toBeUndefined();
    expect(contentStyle.paddingLeft).toBeUndefined();
    expect(contentStyle.paddingRight).toBeUndefined();
    expect(contentStyle.padding).toBeUndefined();
  });

  it("セクション名は日本語で、英字ラベルを出さない", () => {
    render(<FavoritesTab />);

    expect(screen.getByText("最近見た動画")).toBeTruthy();
    expect(screen.getByText("お気に入り")).toBeTruthy();
    expect(screen.queryByText("RECENT")).toBeNull();
    expect(screen.queryByText("FAVORITES")).toBeNull();
    expect(screen.queryByText("YOUTUBE")).toBeNull();
  });
});
