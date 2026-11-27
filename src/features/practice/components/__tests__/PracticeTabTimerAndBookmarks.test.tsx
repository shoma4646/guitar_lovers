import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticeSession } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

const VIDEO_ID = "abc123def45";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
let mockUuidCounter = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `uuid-${++mockUuidCounter}` }));
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn(async () => {}) }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({ data: [] }),
}));
const mockSaveSession = jest.fn(async (_session: PracticeSession) => {});
jest.mock("@/features/progress/api/useSavePracticeSession", () => ({
  useSavePracticeSession: () => ({ mutateAsync: mockSaveSession }),
}));
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => jest.fn(async () => {}),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/usePausePlayerOnBlur", () => ({ usePausePlayerOnBlur: () => {} }));
jest.mock("@/features/practice/hooks/useMetronomeEngine", () => ({
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
let mockOnTimeUpdate: ((time: number) => void) | null = null;
const mockPostMessage = jest.fn();
jest.mock("../VideoPlayerCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: React.forwardRef(function MockPlayer(
      { onTimeUpdate }: { onTimeUpdate: (time: number) => void },
      ref: React.Ref<unknown>,
    ) {
      mockOnTimeUpdate = onTimeUpdate;
      React.useImperativeHandle(ref, () => ({ postMessage: mockPostMessage }));
      return null;
    }),
  };
});
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  usePracticeStore.setState(initialState, true);
  mockSaveSession.mockClear();
  mockPostMessage.mockClear();
  mockOnTimeUpdate = null;
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
  jest.useRealTimers();
});

function renderWithVideoAndOpenMenu() {
  act(() => {
    usePracticeStore.getState().loadVideo(VIDEO_ID, "テスト動画");
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  fireEvent.press(screen.getByRole("button", { name: "メニューを開く" }));
}

function advanceSeconds(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

/** ヘッダーと☰シートの両方に出る練習タイマーの表示 */
function expectTimerDisplay(text: string) {
  expect(screen.getAllByText(text)).toHaveLength(2);
}

function alertButtons(title: string): AlertButton[] {
  const call = alertSpy.mock.calls.find(([t]) => t === title);
  if (!call) throw new Error(`「${title}」のダイアログが出ていません`);
  return call[2] as AlertButton[];
}

describe("PracticeTab: 練習タイマーの一時停止・再開・記録", () => {
  it("一時停止で表示が止まり、再開すると続きから数え、記録すると合計秒が保存されて0に戻る", async () => {
    renderWithVideoAndOpenMenu();

    fireEvent.press(screen.getByRole("button", { name: "タイマーを計測開始" }));
    advanceSeconds(10);
    fireEvent.press(screen.getByRole("button", { name: "タイマーを一時停止" }));
    expectTimerDisplay("00:10");

    advanceSeconds(5);
    expectTimerDisplay("00:10");

    fireEvent.press(screen.getByRole("button", { name: "タイマーを計測開始" }));
    advanceSeconds(5);
    expectTimerDisplay("00:15");

    fireEvent.press(screen.getByRole("button", { name: "記録" }));
    await act(async () => {
      alertButtons("確認").find((b) => b.text === "記録する")?.onPress?.();
    });

    expect(mockSaveSession).toHaveBeenCalledTimes(1);
    expect(mockSaveSession.mock.calls[0][0]).toMatchObject({ duration: 15, videoId: VIDEO_ID });
    expect(alertSpy).toHaveBeenCalledWith("記録完了", "練習を記録しました");
    expectTimerDisplay("00:00");
    expect(screen.getByRole("button", { name: "タイマーを計測開始" })).toBeTruthy();
  });

  it("記録に成功した後に続けて「記録」を押すと、同じ時間を保存せず「記録する練習時間がありません」と出る", async () => {
    renderWithVideoAndOpenMenu();
    fireEvent.press(screen.getByRole("button", { name: "タイマーを計測開始" }));
    advanceSeconds(40);
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "記録" }));
    });
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
    expect(mockSaveSession.mock.calls[0][0].duration).toBe(40);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "記録" }));
    });

    expect(alertSpy).toHaveBeenLastCalledWith("記録できません", "記録する練習時間がありません");
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });
});

describe("PracticeTab: ブックマーク", () => {
  it("追加すると再生位置（秒未満切り捨て）で連番の名前が付き、押すとその位置へ移動する", () => {
    renderWithVideoAndOpenMenu();

    act(() => mockOnTimeUpdate?.(83.7));
    fireEvent.press(screen.getByRole("button", { name: "ブックマークを追加" }));

    expect(screen.getByRole("button", { name: "ブックマーク 1、01:23へ移動" })).toBeTruthy();
    expect(usePracticeStore.getState().bookmarks.map((b) => b.time)).toEqual([83]);

    fireEvent.press(screen.getByRole("button", { name: "ブックマーク 1、01:23へ移動" }));

    expect(mockPostMessage).toHaveBeenLastCalledWith(JSON.stringify({ action: "seek", time: 83 }));
  });

  it("前の位置に追加したブックマークは一覧の上に並び、削除すると押した1件だけが消える", () => {
    renderWithVideoAndOpenMenu();

    act(() => mockOnTimeUpdate?.(83.7));
    fireEvent.press(screen.getByRole("button", { name: "ブックマークを追加" }));
    act(() => mockOnTimeUpdate?.(30.2));
    fireEvent.press(screen.getByRole("button", { name: "ブックマークを追加" }));

    const seekLabels = () =>
      screen.getAllByRole("button", { name: /へ移動$/ }).map((el) => el.props.accessibilityLabel as string);
    expect(seekLabels()).toEqual(["ブックマーク 2、00:30へ移動", "ブックマーク 1、01:23へ移動"]);

    fireEvent.press(screen.getAllByRole("button", { name: "ブックマークを削除" })[0]);

    expect(seekLabels()).toEqual(["ブックマーク 1、01:23へ移動"]);
  });
});
