// jest.mockのfactoryから参照するため、対象モジュールより先にimportしておく必要がある
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { savePracticePhrase, updateReminderSettings } from "@/shared/services/storage";
import type { PracticePhrase } from "@/shared/types/models";
import {
  getLastSyncError,
  REMINDER_NOTIFICATION_ID,
  syncReminder,
} from "../reminderScheduler";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3 },
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

const getPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const schedule = Notifications.scheduleNotificationAsync as jest.Mock;

function permission(granted: boolean) {
  return { granted, canAskAgain: true, status: granted ? "granted" : "denied" };
}

function makePhrase(id: string): PracticePhrase {
  return {
    id,
    videoId: "abc123def45",
    videoTitle: "テスト動画",
    name: "イントロのリフ",
    startSec: 10,
    endSec: 20,
    currentBpm: 90,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("syncReminder", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    getPermissionsAsync.mockResolvedValue(permission(true));
    // DEFAULT_REMINDER_SETTINGS.enabledはfalseなので、各テストで明示的にONへする
    await updateReminderSettings({ enabled: true });
  });

  it("許可済みでフレーズがあれば、固定identifierで取り消してから予約する", async () => {
    await savePracticePhrase(makePhrase("p1"));

    await syncReminder();

    expect(cancel).toHaveBeenCalledWith(REMINDER_NOTIFICATION_ID);
    expect(schedule).toHaveBeenCalledTimes(1);
    const request = schedule.mock.calls[0][0];
    expect(request.identifier).toBe(REMINDER_NOTIFICATION_ID);
    expect(request.content.data).toEqual({ type: "practice-reminder", phraseId: "p1" });
    expect(request.trigger.date).toBeInstanceOf(Date);
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(
      schedule.mock.invocationCallOrder[0],
    );
  });

  it("続けて呼んでも毎回同じidentifierで作り直す", async () => {
    await savePracticePhrase(makePhrase("p1"));

    await syncReminder();
    await syncReminder();

    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule.mock.calls.map(([request]) => request.identifier)).toEqual([
      REMINDER_NOTIFICATION_ID,
      REMINDER_NOTIFICATION_ID,
    ]);
    expect(cancel.mock.invocationCallOrder[1]).toBeLessThan(
      schedule.mock.invocationCallOrder[1],
    );
  });

  it("許可が無ければ取り消すだけで予約しない", async () => {
    await savePracticePhrase(makePhrase("p1"));
    getPermissionsAsync.mockResolvedValue(permission(false));

    await syncReminder();

    expect(cancel).toHaveBeenCalledWith(REMINDER_NOTIFICATION_ID);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("設定がOFFなら取り消すだけで予約しない", async () => {
    await savePracticePhrase(makePhrase("p1"));
    await updateReminderSettings({ enabled: false });

    await syncReminder();

    expect(cancel).toHaveBeenCalledWith(REMINDER_NOTIFICATION_ID);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("実行中に何度呼ばれても、終わった後の作り直しは1回にまとめる", async () => {
    await savePracticePhrase(makePhrase("p1"));

    await Promise.all([syncReminder(), syncReminder(), syncReminder()]);

    expect(getPermissionsAsync).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it("実行中に設定がOFFになったら、最後の作り直しで予約を取り消した状態になる", async () => {
    await savePracticePhrase(makePhrase("p1"));
    let releasePermission: () => void = () => {};
    getPermissionsAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releasePermission = () => resolve(permission(true));
        }),
    );

    const first = syncReminder();
    await updateReminderSettings({ enabled: false });
    const second = syncReminder();
    releasePermission();
    await Promise.all([first, second]);

    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("scheduleがrejectしても例外を投げず、失敗をgetLastSyncErrorで読み出せる", async () => {
    await savePracticePhrase(makePhrase("p1"));
    schedule.mockRejectedValueOnce(new Error("boom"));

    await expect(syncReminder()).resolves.toBeUndefined();

    expect(getLastSyncError()).not.toBeNull();
  });

  it("失敗の後に成功すればgetLastSyncErrorはnullに戻る", async () => {
    await savePracticePhrase(makePhrase("p1"));
    schedule.mockRejectedValueOnce(new Error("boom"));
    await syncReminder();

    await syncReminder();

    expect(getLastSyncError()).toBeNull();
  });
});
