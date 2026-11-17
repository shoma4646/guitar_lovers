import { fireEvent, render, screen } from "@testing-library/react-native";
import { SettingsScreen } from "../SettingsScreen";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));
jest.mock("../../components/ReminderSettingsSection", () => ({
  ReminderSettingsSection: () => null,
}));

beforeEach(() => {
  mockBack.mockReset();
});

describe("SettingsScreen: 閉じる操作", () => {
  it("VoiceOverの閉じる操作（2本指でZ）で前の画面に戻る", () => {
    render(<SettingsScreen />);

    fireEvent(screen.getByTestId("settings-screen"), "accessibilityEscape");

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("右上の閉じるボタンでも前の画面に戻る", () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByRole("button", { name: "閉じる" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
