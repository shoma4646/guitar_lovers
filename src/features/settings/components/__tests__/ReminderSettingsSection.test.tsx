import { render, screen } from "@testing-library/react-native";
import tailwindConfig from "../../../../../tailwind.config.js";
import { ReminderSettingsSection } from "../ReminderSettingsSection";

const tailwindFontSize: Record<string, readonly (string | { lineHeight: string })[]> =
  tailwindConfig.theme.extend.fontSize;

/** classNameに含まれる text-<サイズ名> から、行の高さ÷文字サイズを求める */
function lineHeightRatioOf(className: string | undefined): number {
  const sizeName = (className ?? "")
    .split(/\s+/)
    .map((name) => name.replace(/^text-/, ""))
    .find((name) => name in tailwindFontSize);
  if (sizeName === undefined) throw new Error(`文字サイズのクラスがありません: ${className}`);
  const [fontSize, options] = tailwindFontSize[sizeName];
  if (typeof fontSize !== "string" || typeof options !== "object") {
    throw new Error(`${sizeName}の定義が[文字サイズ, { lineHeight }]の形ではありません`);
  }
  const { lineHeight } = options;
  const size = parseFloat(fontSize);
  const height = lineHeight.endsWith("px") ? parseFloat(lineHeight) : parseFloat(lineHeight) * size;
  return height / size;
}

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

  it.each([
    "前回のBPMと今日の目標をお知らせします。次回の予約はアプリを開いたときに更新されます",
    "自動（ふだんの練習時刻に合わせる）",
    "次回: 10/21 20:05",
  ])("折り返しうる説明文「%s」は行の高さが文字サイズの1.3倍以上", (text) => {
    render(<ReminderSettingsSection />);

    expect(lineHeightRatioOf(screen.getByText(text).props.className)).toBeGreaterThanOrEqual(1.3);
  });
});
