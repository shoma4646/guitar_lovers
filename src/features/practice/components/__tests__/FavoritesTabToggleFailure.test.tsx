import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { addFavoriteVideo } from "@/shared/services/storage";
import { FavoritesTab } from "../FavoritesTab";

jest.mock("expo-crypto", () => ({ randomUUID: () => "favorite-id" }));
jest.mock("@/shared/services/storage", () => ({
  getFavoriteVideos: jest.fn(async () => []),
  getRecentVideos: jest.fn(async () => [
    { videoId: "rec1", title: "最近の動画", lastWatchedAt: new Date().toISOString() },
  ]),
  addFavoriteVideo: jest.fn(async () => undefined),
  removeFavoriteVideo: jest.fn(async () => undefined),
  StorageValidationError: class StorageValidationError extends Error {},
}));
jest.mock("@/features/practice/hooks/useConfirmPhraseSwitch", () => ({
  useConfirmPhraseSwitch: () => jest.fn(),
}));

let client: QueryClient | undefined;

afterEach(() => {
  client?.clear();
  client = undefined;
});

describe("FavoritesTab: お気に入りの切り替えに失敗したとき", () => {
  it("処理されない失敗を出さず、案内を1回だけ出す", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(addFavoriteVideo).mockRejectedValueOnce(new Error("disk full"));
    client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <FavoritesTab />
      </QueryClientProvider>,
    );

    const starButton = await screen.findByLabelText("お気に入りに追加");
    fireEvent.press(starButton, { stopPropagation: () => {} });
    // 処理されない失敗はJestがテストの失敗として拾うため、それが届くまで待つ
    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });

    expect(addFavoriteVideo).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith("保存に失敗しました", expect.any(String));
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
