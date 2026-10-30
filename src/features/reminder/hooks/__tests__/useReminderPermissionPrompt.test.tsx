// jest.mockのfactoryから参照するため、対象モジュールより先にimportしておく必要がある
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, type AlertButton } from "react-native";
import * as Notifications from "expo-notifications";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { getReminderSettings, updateReminderSettings } from "@/shared/services/storage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import { syncReminder } from "@/features/reminder/services/reminderScheduler";
import { useReminderPermissionPrompt } from "../useReminderPermissionPrompt";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3 },
  AndroidImportance: { DEFAULT: 5 },
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  ...jest.requireActual("@/features/reminder/services/reminderScheduler"),
  syncReminder: jest.fn().mockResolvedValue(undefined),
}));

const getPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const mockedSyncReminder = syncReminder as jest.Mock;

function renderPrompt() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useReminderPermissionPrompt(), { wrapper }).result;
}

function pressAlertButton(text: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as AlertButton[];
  const button = buttons.find((b) => b.text === text);
  if (!button?.onPress) throw new Error(`ボタン「${text}」がありません`);
  button.onPress();
}

describe("useReminderPermissionPrompt", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  describe("OSで許可済み・アプリ内では未依頼", () => {
    beforeEach(() => {
      getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: "granted" });
    });

    it("確認ダイアログを出し、「通知を受け取る」でOSに再依頼せずONにして予約を作り直す", async () => {
      const prompt = renderPrompt();
      await act(() => prompt.current());
      expect(Alert.alert).toHaveBeenCalledTimes(1);

      act(() => pressAlertButton("通知を受け取る"));

      await waitFor(() => expect(mockedSyncReminder).toHaveBeenCalledTimes(1));
      const settings = await getReminderSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.permissionPromptedAt).not.toBeNull();
      expect(requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it("「今はしない」では依頼済みの記録だけ書き、OFFのまま", async () => {
      const prompt = renderPrompt();
      await act(() => prompt.current());

      act(() => pressAlertButton("今はしない"));

      await waitFor(async () =>
        expect((await getReminderSettings()).permissionPromptedAt).not.toBeNull(),
      );
      expect((await getReminderSettings()).enabled).toBe(false);
      expect(mockedSyncReminder).not.toHaveBeenCalled();
    });
  });

  it("OSでまだ許可も拒否もしていなければ確認ダイアログを出す", async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: "undetermined" });
    const prompt = renderPrompt();
    await act(() => prompt.current());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["許可済み", { granted: true, canAskAgain: true, status: "granted" }],
    ["未依頼", { granted: false, canAskAgain: true, status: "undetermined" }],
    ["拒否済み", { granted: false, canAskAgain: false, status: "denied" }],
  ])("アプリ内で依頼済みなら、OSが%sでも何も出さない", async (_label, status) => {
    getPermissionsAsync.mockResolvedValue(status);
    await updateReminderSettings({ permissionPromptedAt: "2026-09-01T00:00:00.000Z" });
    const prompt = renderPrompt();
    await act(() => prompt.current());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("OSで拒否済みで再依頼できなければ何も出さない", async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false, status: "denied" });
    const prompt = renderPrompt();
    await act(() => prompt.current());
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("設定画面ですでにONにしていれば何も出さない", async () => {
    getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: "granted" });
    await updateReminderSettings({ enabled: true });
    const prompt = renderPrompt();
    await act(() => prompt.current());
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
