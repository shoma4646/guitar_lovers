import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { ReminderSettings, ReminderTime } from "@/shared/lib/schemas/reminderSettings";
import { ReminderSettingsSection } from "../ReminderSettingsSection";

/** 更新するとすぐに表示へ反映される設定（楽観的更新後のキャッシュと同じ振る舞い） */
const mockSettingsStore = {
  settings: { enabled: true, timeOverride: null, permissionPromptedAt: null } as ReminderSettings,
  listeners: new Set<() => void>(),
};
const mockUpdateSettings = jest.fn((patch: Partial<ReminderSettings>) => {
  mockSettingsStore.settings = { ...mockSettingsStore.settings, ...patch };
  mockSettingsStore.listeners.forEach((listener) => listener());
});

jest.mock("@/features/reminder/api/useReminderSettings", () => {
  const { useSyncExternalStore } = jest.requireActual<typeof import("react")>("react");
  const subscribe = (listener: () => void) => {
    mockSettingsStore.listeners.add(listener);
    return () => mockSettingsStore.listeners.delete(listener);
  };
  return {
    useReminderSettings: () => ({
      data: useSyncExternalStore(subscribe, () => mockSettingsStore.settings),
    }),
  };
});
jest.mock("@/features/reminder/api/useReminderPermission", () => ({
  useReminderPermission: () => ({
    data: { granted: true, canAskAgain: true, undetermined: false },
    refetch: jest.fn(),
  }),
}));
jest.mock("@/features/reminder/api/useNextReminderPlan", () => ({
  useNextReminderPlan: () => ({
    data: { fireAt: new Date(2026, 9, 21, 20, 0), syncFailed: false },
  }),
}));
jest.mock("@/features/reminder/api/useUpdateReminderSettings", () => ({
  useUpdateReminderSettings: () => ({ mutate: mockUpdateSettings }),
}));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({
  ensureReminderPermission: jest.fn(),
}));

const EARLIER = "時刻を30分早くする";
const LATER = "時刻を30分遅くする";

function setTimeOverride(time: ReminderTime | null) {
  mockSettingsStore.settings = { ...mockSettingsStore.settings, timeOverride: time };
}

function timeAdjustable() {
  return screen.getByRole("adjustable", { name: "リマインドの時刻" });
}

function hold(name: string, durationMs: number) {
  const button = screen.getByRole("button", { name });
  fireEvent(button, "pressIn");
  for (let elapsed = 0; elapsed < durationMs; elapsed += 10) {
    act(() => {
      jest.advanceTimersByTime(10);
    });
  }
  fireEvent(button, "pressOut");
}

beforeEach(() => {
  setTimeOverride(null);
  mockUpdateSettings.mockClear();
});

describe("ReminderSettingsSection の時刻ステッパー", () => {
  it.each([EARLIER, LATER])("「%s」ボタンは幅・高さとも44pt以上", (name) => {
    render(<ReminderSettingsSection />);

    const style = StyleSheet.flatten(screen.getByRole("button", { name }).props.style);
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });

  it("時刻の要素は調整可能として現在の時刻を読み上げ値に持つ", () => {
    setTimeOverride({ hour: 20, minute: 30 });
    render(<ReminderSettingsSection />);

    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "20時30分" });
  });

  it("ちょうどの時刻は「◯時」と読み上げる", () => {
    setTimeOverride({ hour: 7, minute: 0 });
    render(<ReminderSettingsSection />);

    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "7時" });
  });

  it("自動のときは読み上げ値も自動であることを伝える", () => {
    render(<ReminderSettingsSection />);

    expect(timeAdjustable().props.accessibilityValue).toEqual({
      text: "自動（ふだんの練習時刻に合わせる）",
    });
  });

  it("increment で30分遅く、decrement で30分早くなり、新しい時刻が読み上げ値に反映される", () => {
    setTimeOverride({ hour: 20, minute: 30 });
    render(<ReminderSettingsSection />);

    fireEvent(timeAdjustable(), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(mockUpdateSettings).toHaveBeenLastCalledWith({ timeOverride: { hour: 21, minute: 0 } });
    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "21時" });

    fireEvent(timeAdjustable(), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    fireEvent(timeAdjustable(), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(mockUpdateSettings).toHaveBeenLastCalledWith({ timeOverride: { hour: 20, minute: 0 } });
    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "20時" });
  });

  it("自動のときの increment は、次回の予定時刻を起点に30分遅くする", () => {
    render(<ReminderSettingsSection />);

    fireEvent(timeAdjustable(), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(mockUpdateSettings).toHaveBeenCalledWith({ timeOverride: { hour: 20, minute: 30 } });
  });

  it("7:00では「早く」だけが無効になり、decrement しても保存しない", () => {
    setTimeOverride({ hour: 7, minute: 0 });
    render(<ReminderSettingsSection />);

    expect(screen.getByRole("button", { name: EARLIER }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByRole("button", { name: LATER }).props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent(timeAdjustable(), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it("22:00では「遅く」だけが無効になり、increment しても保存しない", () => {
    setTimeOverride({ hour: 22, minute: 0 });
    render(<ReminderSettingsSection />);

    expect(screen.getByRole("button", { name: LATER }).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByRole("button", { name: EARLIER }).props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent(timeAdjustable(), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it("通常のタップ1回は30分だけ変わる", () => {
    setTimeOverride({ hour: 20, minute: 0 });
    render(<ReminderSettingsSection />);

    const later = screen.getByRole("button", { name: LATER });
    fireEvent(later, "pressIn");
    fireEvent(later, "pressOut");
    fireEvent.press(later);

    expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "20時30分" });
  });
});

describe("ReminderSettingsSection の時刻の長押しリピート", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("20:00で「早く」を1.05秒押し続けると11段階（5時間30分）早まり14:30になる", () => {
    setTimeOverride({ hour: 20, minute: 0 });
    render(<ReminderSettingsSection />);

    hold(EARLIER, 1050);

    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "14時30分" });
  });

  it("20:00で「遅く」を押し続けても22:00で止まり、それ以上は保存しない", () => {
    setTimeOverride({ hour: 20, minute: 0 });
    render(<ReminderSettingsSection />);

    const later = screen.getByRole("button", { name: LATER });
    fireEvent(later, "pressIn");
    for (let elapsed = 0; elapsed < 1050; elapsed += 10) {
      act(() => {
        jest.advanceTimersByTime(10);
      });
    }

    expect(timeAdjustable().props.accessibilityValue).toEqual({ text: "22時" });
    expect(mockUpdateSettings).toHaveBeenCalledTimes(4);
    // 端で無効になった時点で、指を離す前でも連続入力が止まっている
    expect(jest.getTimerCount()).toBe(0);
    fireEvent(later, "pressOut");
  });
});
