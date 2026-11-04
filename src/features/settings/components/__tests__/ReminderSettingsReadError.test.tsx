import { fireEvent, render, screen } from "@testing-library/react-native";
import { ReminderSettingsSection } from "../ReminderSettingsSection";

const mockSettingsQuery = { data: undefined, isError: true, refetch: jest.fn() };

jest.mock("@/features/reminder/api/useReminderSettings", () => ({
  useReminderSettings: () => mockSettingsQuery,
}));
jest.mock("@/features/reminder/api/useReminderPermission", () => ({
  useReminderPermission: () => ({
    data: { granted: true, canAskAgain: true, undetermined: false },
    refetch: jest.fn(),
  }),
}));
jest.mock("@/features/reminder/api/useNextReminderPlan", () => ({
  useNextReminderPlan: () => ({ data: undefined }),
}));
jest.mock("@/features/reminder/api/useUpdateReminderSettings", () => ({
  useUpdateReminderSettings: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  ensureReminderPermission: jest.fn(),
}));

describe("ReminderSettingsSection: 設定を読み出せないとき", () => {
  it("何も描かずに消えるのではなく、エラー行と再読み込みを出す", () => {
    render(<ReminderSettingsSection />);

    expect(screen.getByText(/リマインド設定を読み込めませんでした/)).toBeTruthy();
    expect(screen.queryByLabelText("練習リマインド")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "再読み込み" }));
    expect(mockSettingsQuery.refetch).toHaveBeenCalled();
  });
});
