import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { FavoritesTab } from "../FavoritesTab";

const mockToggleFavorite = jest.fn();

jest.mock("@/features/practice/api/useFavoriteVideos", () => ({
  useFavoriteVideos: () => ({
    data: [{ id: "f1", videoId: "fav1", title: "お気に入りの動画", addedAt: new Date().toISOString() }],
  }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({
    data: [{ videoId: "rec1", title: "最近の動画", lastWatchedAt: new Date().toISOString() }],
  }),
}));
jest.mock("@/features/practice/api/useToggleFavoriteVideo", () => ({
  useToggleFavoriteVideo: () => ({ mutateAsync: mockToggleFavorite }),
}));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => jest.fn(),
}));

describe("FavoritesTab の読み上げ", () => {
  beforeEach(() => {
    mockToggleFavorite.mockClear();
  });

  it("最近見た動画・お気に入りのカードは role=button でラベルにタイトルを含む", () => {
    render(<FavoritesTab />);
    expect(screen.getByRole("button", { name: /最近の動画/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /お気に入りの動画/ })).toBeTruthy();
  });

  it("カードにお気に入りを切り替える操作があり、ラベルは状態に応じて変わる", () => {
    render(<FavoritesTab />);
    const recent = screen.getByRole("button", { name: /最近の動画/ });
    const favorite = screen.getByRole("button", { name: /お気に入りの動画/ });
    expect(recent.props.accessibilityActions).toContainEqual({ name: "toggleFavorite", label: "お気に入りに追加" });
    expect(favorite.props.accessibilityActions).toContainEqual({ name: "toggleFavorite", label: "お気に入りから削除" });
  });

  it("最近見た動画のカードの toggleFavorite でお気に入りに追加される", () => {
    render(<FavoritesTab />);
    const recent = screen.getByRole("button", { name: /最近の動画/ });
    fireEvent(recent, "accessibilityAction", { nativeEvent: { actionName: "toggleFavorite" } });
    expect(mockToggleFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ type: "add", video: expect.objectContaining({ videoId: "rec1" }) }),
    );
  });

  it("お気に入りのカードの toggleFavorite でお気に入りから削除される", () => {
    render(<FavoritesTab />);
    const favorite = screen.getByRole("button", { name: /お気に入りの動画/ });
    fireEvent(favorite, "accessibilityAction", { nativeEvent: { actionName: "toggleFavorite" } });
    expect(mockToggleFavorite).toHaveBeenCalledWith({ type: "remove", videoId: "fav1" });
  });

  it("星ボタンは大きさと hitSlop を合わせて縦横44以上", () => {
    render(<FavoritesTab />);
    const card = screen.getByRole("button", { name: /最近の動画/ });
    const star = within(card).getByLabelText("お気に入りに追加");
    const style = StyleSheet.flatten(star.props.style);
    const slop = typeof star.props.hitSlop === "number" ? star.props.hitSlop : 0;
    expect(style.width + slop * 2).toBeGreaterThanOrEqual(44);
    expect(style.height + slop * 2).toBeGreaterThanOrEqual(44);
  });
});
