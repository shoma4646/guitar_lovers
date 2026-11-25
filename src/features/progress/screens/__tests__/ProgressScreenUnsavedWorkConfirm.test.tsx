import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Alert, type AlertButton } from "react-native";
import { getPracticePhrases } from "@/shared/services/storage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { ProgressScreen } from "../ProgressScreen";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@expo/vector-icons/MaterialIcons", () => () => null);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/shared/services/storage", () => ({
  getPracticeSessions: jest.fn(async () => []),
  getPhraseAttempts: jest.fn(async () => []),
  getPracticePhrases: jest.fn(async () => []),
  savePracticeSession: jest.fn(async () => undefined),
  deletePracticeSession: jest.fn(async () => undefined),
  StorageValidationError: class StorageValidationError extends Error {},
}));

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "dQw4w9WgXcQ",
  videoTitle: "video",
  name: "イントロ",
  startSec: 0,
  endSec: 10,
  currentBpm: 100,
  targetBpm: 160,
  playbackRate: 1,
  createdAt: "2026-11-01T03:00:00.000Z",
  updatedAt: "2026-11-01T03:00:00.000Z",
  initialBpm: 80,
};

const initialState = usePracticeStore.getState();
let client: QueryClient | undefined;

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockPush.mockClear();
});

afterEach(() => {
  client?.clear();
  client = undefined;
});

async function renderScreen() {
  jest.mocked(getPracticePhrases).mockResolvedValue([PHRASE]);
  client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <ProgressScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client?.isFetching()).toBe(0));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("ProgressScreen: 保存していない区間・ブックマークがあるときの「今日の1本を開く」", () => {
  it("確認を出し、キャンセルすると練習中の動画の区間とブックマークが残る", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    act(() => {
      const store = usePracticeStore.getState();
      store.loadVideo("abc123def45", "作業中の動画");
      store.setABLoop({ pointA: 83, pointB: 101, enabled: true });
      store.addBookmark({ id: "b1", time: 90, createdAt: "2026-09-01T00:00:00.000Z" });
    });
    await renderScreen();

    fireEvent.press(screen.getByRole("button", { name: /今日の1本を開く/ }));

    expect(alertSpy).toHaveBeenCalledWith(
      "保存していない内容が消えます",
      "区間 01:23〜01:41とブックマーク1件はまだ保存されていません。切り替えると失われます。",
      expect.any(Array),
    );
    act(() => {
      (alertSpy.mock.calls[0][2] as AlertButton[]).find((b) => b.text === "キャンセル")?.onPress?.();
    });
    const state = usePracticeStore.getState();
    expect(state.loadedVideoId).toBe("abc123def45");
    expect(state.abLoop).toEqual({ pointA: 83, pointB: 101, enabled: true });
    expect(state.bookmarks).toHaveLength(1);
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("動画を読み込んでいなければ確認なしで開く", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderScreen();

    fireEvent.press(screen.getByRole("button", { name: /今日の1本を開く/ }));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe(PHRASE.id);
    alertSpy.mockRestore();
  });
});
