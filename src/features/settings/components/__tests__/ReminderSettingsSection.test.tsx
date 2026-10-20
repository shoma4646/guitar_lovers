import { render, screen } from "@testing-library/react-native";
import { ReminderSettingsSection } from "../ReminderSettingsSection";

jest.mock("@/features/reminder/api/useReminderSettings", () => ({
  useReminderSettings: () => ({ data: { enabled: true, timeOverride: null } }),
}));
jest.mock("@/features/reminder/api/useReminderPermission", () => ({
  useReminderPermission: () => ({
    data: { granted: true, canAskAgain: true, undetermined: false },
    refetch: jest.fn(),
  }),
}));
jest.mock("@/features/reminder/api/useNextReminderPlan", () => ({
  useNextReminderPlan: () => ({
    data: { fireAt: new Date(2026, 9, 21, 20, 5), syncFailed: false },
  }),
}));
jest.mock("@/features/reminder/api/useUpdateReminderSettings", () => ({
  useUpdateReminderSettings: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  ensureReminderPermission: jest.fn(),
}));

describe("ReminderSettingsSection", () => {
  it("予約の発火日時があれば「次回: M/D H:MM」を表示する", () => {
    render(<ReminderSettingsSection />);

    expect(screen.getByText("次回: 10/21 20:05")).toBeTruthy();
    expect(screen.queryByText("フレーズを保存すると予約されます")).toBeNull();
  });
});
