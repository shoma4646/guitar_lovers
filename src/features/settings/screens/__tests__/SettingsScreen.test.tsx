import { fireEvent, render, screen } from "@testing-library/react-native";
import { MIN_TOUCH_TARGET, minTouchTargetSize } from "@/shared/testing/touchTarget";
import { SettingsScreen } from "../SettingsScreen";
import { ScrollView, StyleSheet } from "react-native";
import { Card } from "@/shared/components/molecules/Card";
import { SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";
import { colors } from "@/shared/theme";

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

  it("右上の閉じるボタンは本体＋hitSlopで縦横44pt以上", () => {
    render(<SettingsScreen />);

    const size = minTouchTargetSize(screen.getByRole("button", { name: "閉じる" }));
    expect(size.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(size.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});

describe("SettingsScreen: 見出し", () => {
  it("画面タイトルと各セクション名だけが見出しとして読まれる", () => {
    render(<SettingsScreen />);

    const headers = screen.getAllByRole("header").map((h) => h.props.children);
    expect(headers).toEqual(["設定", "リマインド", "アプリについて", "プライバシーとサポート", "利用しているサービス"]);
  });
});

describe("SettingsScreen: タブ画面とそろえた見た目", () => {
  it("各セクションはタブ画面と同じ影付きの共通カードで描く", () => {
    render(<SettingsScreen />);

    const cards = screen.UNSAFE_getAllByType(Card);
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.props.elevation ?? "low").toBe("low");
      expect(card.props.padding).toBe(0);
    }
  });

  it("左右の余白はタブ画面と同じ値にする", () => {
    render(<SettingsScreen />);

    const content = StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle);
    expect(content.paddingHorizontal).toBe(SCREEN_HORIZONTAL_PADDING);
    const header = StyleSheet.flatten(screen.getByTestId("settings-header").props.style);
    expect(header.paddingHorizontal).toBe(SCREEN_HORIZONTAL_PADDING);
  });

  it("画面見出しはタブ画面と同じ22pt・太さ800で、拡大率に上限を付ける", () => {
    render(<SettingsScreen />);

    const title = screen.getByRole("header", { name: "設定" });
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({ fontSize: 22, fontWeight: "800" });
    expect(title.props.maxFontSizeMultiplier).toBe(1.3);
  });

  it("セクション見出しに旧デザインの字間と大文字化を残さない", () => {
    render(<SettingsScreen />);

    const sectionHeader = StyleSheet.flatten(screen.getByRole("header", { name: "アプリについて" }).props.style);
    expect(sectionHeader.letterSpacing).toBeUndefined();
    expect(sectionHeader.textTransform).toBeUndefined();
  });

  it("行の区切り線はタブ画面と同じ色を使う", () => {
    render(<SettingsScreen />);

    const row = StyleSheet.flatten(screen.getByRole("link", { name: "プライバシーポリシー" }).props.style);
    expect(row).toMatchObject({ borderBottomColor: colors.divider, paddingHorizontal: 16, paddingVertical: 12 });
  });
});
