import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { QueryClientProvider, focusManager, type QueryClient } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react-native";
import { createAppQueryClient } from "@/shared/lib/createAppQueryClient";
import { connectQueryFocusToAppState } from "@/shared/lib/queryFocus";
import {
  STORAGE_KEYS,
  savePhraseAttempt,
  savePracticePhrase,
  updateReminderSettings,
} from "@/shared/services/storage";
import { usePracticePhrases } from "@/features/practice/api/usePracticePhrases";
import { usePhraseAttempts } from "@/features/practice/api/usePhraseAttempts";
import { useRecordPhraseResult } from "@/features/practice/api/useRecordPhraseResult";
import { useGraduatePracticePhrase } from "@/features/practice/api/useGraduatePracticePhrase";
import { usePracticeSessions } from "@/features/progress/api/usePracticeSessions";
import { ReminderBridge } from "@/features/reminder/components/ReminderBridge";
import type { PracticePhrase } from "@/shared/types/models";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  setNotificationChannelAsync: jest.fn(),
  useLastNotificationResponse: () => null,
  clearLastNotificationResponse: jest.fn(),
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3 },
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ navigate: jest.fn() }) }));

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  currentBpm: 110,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

type Screen = {
  record: ReturnType<typeof useRecordPhraseResult>;
  graduate: ReturnType<typeof useGraduatePracticePhrase>;
};

function PracticeScreenProbe({ onRender }: { onRender: (screen: Screen) => void }) {
  usePracticePhrases();
  usePhraseAttempts();
  usePracticeSessions();
  onRender({ record: useRecordPhraseResult(), graduate: useGraduatePracticePhrase() });
  return null;
}

function readsOf(key: string): number {
  return (AsyncStorage.getItem as jest.Mock).mock.calls.filter(([k]) => k === key).length;
}

/** 読み込み・予約の作り直しがすべて終わるまで待つ */
async function settle(queryClient: QueryClient) {
  await waitFor(() => {
    expect(queryClient.isFetching()).toBe(0);
    expect(queryClient.isMutating()).toBe(0);
  });
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe("端末内の練習データの読み込み回数", () => {
  let queryClient: QueryClient;
  let screen: Screen;
  let appStateListeners: ((state: AppStateStatus) => void)[];
  let disconnectFocus: () => void;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: "granted",
    });
    await savePracticePhrase(PHRASE);
    for (let i = 0; i < 5; i++) {
      await savePhraseAttempt({
        id: `old${i}`,
        phraseId: "p1",
        date: `2026-09-0${i + 2}T00:00:00.000Z`,
        bpm: 100 + i,
        result: "ok",
      });
    }
    await updateReminderSettings({ enabled: true });

    appStateListeners = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, fn) => {
      appStateListeners.push(fn as (state: AppStateStatus) => void);
      return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
    });
    disconnectFocus = connectQueryFocusToAppState();

    queryClient = createAppQueryClient();
    // gcタイマーが残るとjestが終了しないため、本番の既定値（staleTime）だけを引き継いでgcを止める
    const defaults = queryClient.getDefaultOptions();
    queryClient.setDefaultOptions({
      queries: { ...defaults.queries, gcTime: Infinity },
      mutations: { ...defaults.mutations, gcTime: Infinity },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReminderBridge />
        <PracticeScreenProbe onRender={(s) => (screen = s)} />
      </QueryClientProvider>,
    );
    await settle(queryClient);
    expect(schedule).toHaveBeenCalled();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    schedule.mockClear();
  });

  afterEach(() => {
    disconnectFocus();
    queryClient.clear();
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
  });

  it("結果を1件記録して卒業しても、全練習記録は2回以下・全フレーズは4回以下しか読まない", async () => {
    await act(async () => {
      await screen.record.mutateAsync({
        id: "new",
        phraseId: "p1",
        date: "2026-09-10T00:00:00.000Z",
        bpm: 120,
        result: "ok",
      });
      screen.graduate.mutate({ id: "p1", graduatedAt: "2026-09-10T00:00:00.000Z" });
    });
    await settle(queryClient);

    expect(schedule).toHaveBeenCalled();
    expect(readsOf(STORAGE_KEYS.PHRASE_ATTEMPTS)).toBeLessThanOrEqual(2);
    expect(readsOf(STORAGE_KEYS.PRACTICE_PHRASES)).toBeLessThanOrEqual(4);
  });

  it("記録後に作り直した予約は、記録した結果を反映している", async () => {
    await act(async () => {
      await screen.record.mutateAsync({
        id: "new",
        phraseId: "p1",
        date: "2026-09-10T00:00:00.000Z",
        bpm: 118,
        result: "ok",
      });
    });
    await settle(queryClient);

    const lastBody: string = schedule.mock.calls.at(-1)?.[0].content.body;
    expect(lastBody).toContain("118");
  });

  it("前面に戻ると予約は作り直すが、画面用の練習データは読み直さない", async () => {
    await act(async () => {
      appStateListeners.forEach((listener) => listener("background"));
    });
    await settle(queryClient);
    schedule.mockClear();
    (AsyncStorage.getItem as jest.Mock).mockClear();

    await act(async () => {
      appStateListeners.forEach((listener) => listener("active"));
    });
    await settle(queryClient);

    expect(focusManager.isFocused()).toBe(true);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(readsOf(STORAGE_KEYS.PRACTICE_PHRASES)).toBe(0);
    expect(readsOf(STORAGE_KEYS.PHRASE_ATTEMPTS)).toBe(0);
    expect(readsOf(STORAGE_KEYS.PRACTICE_SESSIONS)).toBe(0);
  });
});
