import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react-native";
import { ReminderBridge } from "@/features/reminder/components/ReminderBridge";
import { REMINDER_DATA_TYPE } from "@/features/reminder/lib/planReminder";
import { getPhraseAttempts, getPracticePhrases } from "@/shared/services/storage";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";

const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

let mockLastResponse: NotificationResponse | null = null;
const mockNavigate = jest.fn();

jest.mock("expo-notifications", () => ({
  useLastNotificationResponse: () => mockLastResponse,
  clearLastNotificationResponse: jest.fn(),
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock("@/shared/services/storage", () => ({
  getPracticePhrases: jest.fn(),
  getPhraseAttempts: jest.fn(),
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  syncReminder: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/features/reminder/services/reminderSyncSubscription", () => ({
  subscribeReminderSync: jest.fn(() => () => {}),
}));

const clearLastResponse = Notifications.clearLastNotificationResponse as jest.Mock;

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  currentBpm: 100,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function response({
  actionIdentifier = DEFAULT_ACTION,
  data = { type: REMINDER_DATA_TYPE, phraseId: "p1" },
  identifier = "reminder-1",
  date = 1_790_000_000_000,
}: {
  actionIdentifier?: string;
  data?: Record<string, unknown>;
  identifier?: string;
  date?: number;
} = {}): NotificationResponse {
  return {
    actionIdentifier,
    notification: {
      date,
      request: { identifier, content: { data }, trigger: null },
    },
  } as unknown as NotificationResponse;
}

const initialState = usePracticeStore.getState();
let queryClient: QueryClient;

function bridge() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReminderBridge />
    </QueryClientProvider>
  );
}

/** 練習開始の非同期処理（ストレージ読み込み）を流し切る */
async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLastResponse = null;
  usePracticeStore.setState(initialState, true);
  queryClient = new QueryClient();
  jest.mocked(getPracticePhrases).mockResolvedValue([PHRASE]);
  jest.mocked(getPhraseAttempts).mockResolvedValue([]);
});

afterEach(() => {
  queryClient.clear();
});

describe("リマインド通知のタップ", () => {
  it("通知をタップすると、OSに残った応答を消し、名指しのフレーズで練習を始めて練習タブへ移る", async () => {
    mockLastResponse = response();
    render(bridge());

    await waitFor(() => {
      expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe("p1");
    });
    expect(clearLastResponse).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/(tabs)/practice");
  });

  it("同じ応答（同じidentifierとdate）で再描画しても、練習は始め直さず回数を保つ", async () => {
    mockLastResponse = response();
    const { rerender } = render(bridge());
    await waitFor(() => {
      expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe("p1");
    });
    act(() => {
      usePracticeStore.getState().incrementCompletedReps();
    });

    mockLastResponse = response();
    rerender(bridge());
    await flush();

    expect(usePracticeStore.getState().activePhrasePractice?.completedReps).toBe(1);
    expect(getPracticePhrases).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(clearLastResponse).toHaveBeenCalledTimes(1);
  });

  it("タップ以外の操作（通知の削除など）の応答では何もしない", async () => {
    mockLastResponse = response({ actionIdentifier: "expo.modules.notifications.actions.DISMISSED" });
    render(bridge());
    await flush();

    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    expect(getPracticePhrases).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(clearLastResponse).not.toHaveBeenCalled();
  });

  it("リマインド以外の通知のタップでは何もしない", async () => {
    mockLastResponse = response({ data: { type: "other", phraseId: "p1" } });
    render(bridge());
    await flush();

    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    expect(getPracticePhrases).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(clearLastResponse).not.toHaveBeenCalled();
  });

  it("応答が無い通常起動では何もしない", async () => {
    render(bridge());
    await flush();

    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(clearLastResponse).not.toHaveBeenCalled();
  });
});
