import type { ReactNode } from "react";
import { Alert } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { getReminderSettings, updateReminderSettings } from "@/shared/services/storage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";
import type { ReminderSettings } from "@/shared/lib/schemas/reminderSettings";
import { reminderQueryKeys, useReminderSettings } from "../useReminderSettings";
import { useUpdateReminderSettings } from "../useUpdateReminderSettings";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/shared/services/storage", () => ({
  ...jest.requireActual("@/shared/services/storage"),
  getReminderSettings: jest.fn(),
  updateReminderSettings: jest.fn(),
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  syncReminder: jest.fn().mockResolvedValue(undefined),
}));

const mockedGet = getReminderSettings as jest.Mock;
const mockedUpdate = updateReminderSettings as jest.Mock;

const STORED: ReminderSettings = {
  enabled: true,
  timeOverride: { hour: 20, minute: 0 },
  permissionPromptedAt: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderUpdate() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({ settings: useReminderSettings(), update: useUpdateReminderSettings() }),
    { wrapper },
  );
  return { client, result };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedGet.mockResolvedValue(STORED);
});

describe("useUpdateReminderSettings の楽観的更新", () => {
  it("保存が終わる前に、設定のキャッシュへ変更を反映する", async () => {
    const pending = deferred<ReminderSettings>();
    mockedUpdate.mockReturnValue(pending.promise);
    const { result } = renderUpdate();
    await waitFor(() => expect(result.current.settings.data).toEqual(STORED));

    act(() => {
      result.current.update.mutate({ timeOverride: { hour: 20, minute: 30 } });
    });

    await waitFor(() =>
      expect(result.current.settings.data?.timeOverride).toEqual({ hour: 20, minute: 30 }),
    );
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ ...STORED, timeOverride: { hour: 20, minute: 30 } }));
  });

  it("連続で更新したとき、先の保存が終わっても後の変更を古い値で上書きせず、最後の保存後に1回だけ取り直す", async () => {
    const first = deferred<ReminderSettings>();
    const second = deferred<ReminderSettings>();
    mockedUpdate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { client, result } = renderUpdate();
    await waitFor(() => expect(result.current.settings.data).toEqual(STORED));
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.update.mutate({ timeOverride: { hour: 20, minute: 30 } });
    });
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.update.mutate({ timeOverride: { hour: 21, minute: 0 } });
    });
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(2));

    await act(async () => first.resolve({ ...STORED, timeOverride: { hour: 20, minute: 30 } }));
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(result.current.settings.data?.timeOverride).toEqual({ hour: 21, minute: 0 });

    mockedGet.mockResolvedValue({ ...STORED, timeOverride: { hour: 21, minute: 0 } });
    await act(async () => second.resolve({ ...STORED, timeOverride: { hour: 21, minute: 0 } }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reminderQueryKeys.all });
    expect(result.current.settings.data?.timeOverride).toEqual({ hour: 21, minute: 0 });
  });

  it("保存に失敗したら、端末に保存されている値へ戻してエラーを知らせる", async () => {
    mockedUpdate.mockRejectedValue(new Error("disk full"));
    const { result } = renderUpdate();
    await waitFor(() => expect(result.current.settings.data).toEqual(STORED));

    act(() => {
      result.current.update.mutate({ timeOverride: { hour: 20, minute: 30 } });
    });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    await waitFor(() => expect(result.current.settings.data?.timeOverride).toEqual({ hour: 20, minute: 0 }));
  });

  it("値がundefinedのキーは、保存と同じくキャッシュでも既存の値を消さない", async () => {
    const pending = deferred<ReminderSettings>();
    mockedUpdate.mockReturnValue(pending.promise);
    const { result } = renderUpdate();
    await waitFor(() => expect(result.current.settings.data).toEqual(STORED));

    act(() => {
      result.current.update.mutate({ enabled: false, timeOverride: undefined });
    });

    await waitFor(() => expect(result.current.settings.data?.enabled).toBe(false));
    expect(result.current.settings.data?.timeOverride).toEqual({ hour: 20, minute: 0 });
    await act(async () => pending.resolve({ ...STORED, enabled: false }));
  });
});
