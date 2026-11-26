import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ensureReminderPermission } from "@/features/reminder/services/reminderScheduler";
import type { ReminderPermission } from "@/features/reminder/services/reminderScheduler";
import { ReminderSettingsSection } from "../ReminderSettingsSection";

const OS_OFF_MESSAGE = "端末の設定で通知がオフのため、リマインドは届きません";
const SAVE_TO_SCHEDULE_MESSAGE = "フレーズを保存すると予約されます";

let mockPermission: ReminderPermission = { granted: true, canAskAgain: true, undetermined: false };
let mockFireAt: Date | null = null;
const mockRefetchPermission = jest.fn();
const mockUpdateSettings = jest.fn();

jest.mock("@/features/reminder/api/useReminderSettings", () => ({
  useReminderSettings: () => ({ data: { enabled: true, timeOverride: null } }),
}));
jest.mock("@/features/reminder/api/useReminderPermission", () => ({
  useReminderPermission: () => ({ data: mockPermission, refetch: mockRefetchPermission }),
}));
jest.mock("@/features/reminder/api/useNextReminderPlan", () => ({
  useNextReminderPlan: () => ({ data: { fireAt: mockFireAt, syncFailed: false } }),
}));
jest.mock("@/features/reminder/api/useUpdateReminderSettings", () => ({
  useUpdateReminderSettings: () => ({ mutate: mockUpdateSettings }),
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  ensureReminderPermission: jest.fn(),
}));

beforeEach(() => {
  mockFireAt = null;
  mockRefetchPermission.mockClear();
  mockUpdateSettings.mockClear();
  jest.mocked(ensureReminderPermission).mockReset();
});

describe("リマインドON・端末の設定で通知がオフ（もう一度は聞けない）", () => {
  beforeEach(() => {
    mockPermission = { granted: false, canAskAgain: false, undetermined: false };
  });

  it("「保存すると予約されます」ではなく、通知がオフで届かないことと「設定を開く」を出す", () => {
    render(<ReminderSettingsSection />);

    expect(screen.queryByText(SAVE_TO_SCHEDULE_MESSAGE)).toBeNull();
    expect(screen.getByText(OS_OFF_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "端末の設定を開く" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "通知を許可する" })).toBeNull();
  });

  it("「設定を開く」で端末の設定アプリを開く", () => {
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    render(<ReminderSettingsSection />);

    fireEvent.press(screen.getByRole("button", { name: "端末の設定を開く" }));

    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });
});

describe("リマインドON・通知の許可が無いが、もう一度聞ける", () => {
  beforeEach(() => {
    mockPermission = { granted: false, canAskAgain: true, undetermined: false };
  });

  it("通知がオフの説明と「通知を許可する」を出す", () => {
    render(<ReminderSettingsSection />);

    expect(screen.queryByText(SAVE_TO_SCHEDULE_MESSAGE)).toBeNull();
    expect(screen.getByText(OS_OFF_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "通知を許可する" })).toBeTruthy();
  });

  it("「通知を許可する」で許可を求めて許可状態を読み直し、許可されたら予約を作り直す", async () => {
    jest.mocked(ensureReminderPermission).mockResolvedValue(true);
    render(<ReminderSettingsSection />);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "通知を許可する" }));
    });

    expect(ensureReminderPermission).toHaveBeenCalledTimes(1);
    expect(mockRefetchPermission).toHaveBeenCalledTimes(1);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: true });
  });

  it("許可されなければ、許可状態の読み直しだけで設定は書き換えない", async () => {
    jest.mocked(ensureReminderPermission).mockResolvedValue(false);
    render(<ReminderSettingsSection />);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "通知を許可する" }));
    });

    expect(mockRefetchPermission).toHaveBeenCalledTimes(1);
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });
});

describe("リマインドON・通知が許可済みで予約が無い", () => {
  beforeEach(() => {
    mockPermission = { granted: true, canAskAgain: true, undetermined: false };
  });

  it("今と同じ「フレーズを保存すると予約されます」を出し、許可の案内は出さない", () => {
    render(<ReminderSettingsSection />);

    expect(screen.getByText(SAVE_TO_SCHEDULE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(OS_OFF_MESSAGE)).toBeNull();
    expect(screen.queryByRole("button", { name: "通知を許可する" })).toBeNull();
    expect(screen.queryByRole("button", { name: "端末の設定を開く" })).toBeNull();
  });
});
