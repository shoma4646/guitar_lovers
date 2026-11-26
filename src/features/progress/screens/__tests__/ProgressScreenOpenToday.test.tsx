import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { TodayPickCard } from "@/features/practice/components/TodayPickCard";
import { usePracticeStore } from "@/stores/practice";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { ProgressScreen } from "../ProgressScreen";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/shared/components/molecules/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

function yesterdayNoon(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12);
}

const mockPhrase: PracticePhrase = {
  id: "p1",
  videoId: "dQw4w9WgXcQ",
  videoTitle: "video",
  name: "イントロ",
  startSec: 0,
  endSec: 10,
  initialBpm: 80,
  currentBpm: 100,
  targetBpm: 160,
  playbackRate: 1,
  createdAt: "2026-11-01T03:00:00.000Z",
  updatedAt: "2026-11-01T03:00:00.000Z",
};

// 前日に到達BPM 100 で弾けたので、今日の目標は 105
const mockAttempts: PhraseAttempt[] = [
  { id: "a1", phraseId: "p1", date: yesterdayNoon().toISOString(), bpm: 100, result: "ok" },
];

jest.mock("@/shared/services/storage", () => ({
  getPracticeSessions: jest.fn(async () => []),
  getPhraseAttempts: jest.fn(async () => mockAttempts),
  getPracticePhrases: jest.fn(async () => [mockPhrase]),
  savePracticeSession: jest.fn(async () => undefined),
  deletePracticeSession: jest.fn(async () => undefined),
  StorageValidationError: class StorageValidationError extends Error {},
}));

const initialState = usePracticeStore.getState();
let client: QueryClient | undefined;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockPush.mockClear();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
  client?.clear();
  client = undefined;
});

async function renderProgressWithTodayPickCard() {
  client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <TodayPickCard onStartPhrase={jest.fn()} onTryPreset={jest.fn()} onOpenAddVideo={jest.fn()} />
      <ProgressScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client?.isFetching()).toBe(0));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function pressOpenToday() {
  fireEvent.press(screen.getByRole("button", { name: /今日の1本を開く/ }));
}

describe("進捗タブの「今日の1本を開く」", () => {
  it("今日の1本カードに出ている今日の目標BPM（前回の到達BPM+5）でメトロノームを始める", async () => {
    await renderProgressWithTodayPickCard();
    expect(screen.getByText("105 BPM")).toBeTruthy();

    pressOpenToday();

    const state = usePracticeStore.getState();
    expect(state.activePhrasePractice?.phrase.id).toBe("p1");
    expect(state.activePhrasePractice?.goalBpm).toBe(105);
    expect(state.metronomeBpm).toBe(105);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/practice");
  });

  it("同じフレーズを練習中なら、確認を出さず回数も0に戻さずに練習タブへ戻るだけにする", async () => {
    act(() => {
      const store = usePracticeStore.getState();
      store.startPhrasePractice(mockPhrase, 105);
      store.incrementCompletedReps();
      store.incrementCompletedReps();
    });
    await renderProgressWithTodayPickCard();

    pressOpenToday();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().activePhrasePractice?.completedReps).toBe(2);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/practice");
  });
});
