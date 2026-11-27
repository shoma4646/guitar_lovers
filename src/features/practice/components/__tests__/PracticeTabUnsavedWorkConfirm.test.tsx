import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import type { SavePhraseInput } from "../SavePhraseSheet";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロ",
  startSec: 10,
  endSec: 20,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
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
  usePracticePhrases: () => ({ data: [PHRASE] }),
}));
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({ data: [] }),
}));
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => jest.fn(async () => {}),
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/useSaveTimerSession", () => ({
  useSaveTimerSession: () => ({ saveTimerSession: jest.fn(), isSaving: false }),
}));
jest.mock("@/features/practice/hooks/usePausePlayerOnBlur", () => ({ usePausePlayerOnBlur: () => {} }));
jest.mock("@/features/practice/hooks/useMetronomeEngine", () => ({
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
jest.mock("../VideoPlayerCard", () => ({ VideoPlayerCard: () => null }));
let mockOnClearLoop: (() => void) | null = null;
jest.mock("../PracticeControlPanel", () => ({
  PracticeControlPanel: ({ onClearLoop }: { onClearLoop: () => void }) => {
    mockOnClearLoop = onClearLoop;
    return null;
  },
}));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
let mockOnSave: ((input: SavePhraseInput) => Promise<void>) | null = null;
jest.mock("../SavePhraseSheet", () => ({
  SavePhraseSheet: ({ onSave }: { onSave: (input: SavePhraseInput) => Promise<void> }) => {
    mockOnSave = onSave;
    return null;
  },
}));

const initialState = usePracticeStore.getState();
const UNSAVED_TITLE = "保存していない内容が消えます";
const UNSAVED_MESSAGE = "区間 01:23〜01:41とブックマーク2件はまだ保存されていません。切り替えると失われます。";

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockOnClearLoop = null;
  mockOnSave = null;
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

/** 練習中フレーズなしで、保存済みフレーズと違う区間とブックマーク2件を作った状態にする */
function prepareUnsavedWork() {
  act(() => {
    const store = usePracticeStore.getState();
    store.loadVideo(PHRASE.videoId, PHRASE.videoTitle);
    store.setDuration(300);
    store.setABLoop({ pointA: 83, pointB: 101, enabled: true });
    store.addBookmark({ id: "b1", time: 85, createdAt: "2026-09-01T00:00:00.000Z" });
    store.addBookmark({ id: "b2", time: 95, createdAt: "2026-09-01T00:00:00.000Z" });
  });
}

function pressAlertButton(title: string, text: string) {
  const call = alertSpy.mock.calls.find(([t]) => t === title);
  if (!call) throw new Error(`「${title}」のダイアログが出ていません`);
  act(() => {
    (call[2] as AlertButton[]).find((b) => b.text === text)?.onPress?.();
  });
}

function expectWorkKept() {
  const state = usePracticeStore.getState();
  expect(state.loadedVideoId).toBe(PHRASE.videoId);
  expect(state.abLoop).toEqual({ pointA: 83, pointB: 101, enabled: true });
  expect(state.bookmarks.map((b) => b.id)).toEqual(["b1", "b2"]);
}

describe("PracticeTab: 保存していない区間・ブックマークがあるときの切り替え", () => {
  it("☰の「動画を閉じる」で確認が出て、キャンセルすると区間とブックマークが残る", () => {
    prepareUnsavedWork();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    fireEvent.press(screen.getByRole("button", { name: "メニューを開く" }));
    fireEvent.press(screen.getByRole("button", { name: "動画を閉じる" }));

    expect(alertSpy).toHaveBeenCalledWith(UNSAVED_TITLE, UNSAVED_MESSAGE, expect.any(Array));
    expectWorkKept();
    pressAlertButton(UNSAVED_TITLE, "キャンセル");
    expectWorkKept();
  });

  it("確認で「切り替える」を選ぶと動画を閉じる", () => {
    prepareUnsavedWork();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    fireEvent.press(screen.getByRole("button", { name: "メニューを開く" }));
    fireEvent.press(screen.getByRole("button", { name: "動画を閉じる" }));
    pressAlertButton(UNSAVED_TITLE, "切り替える");

    expect(usePracticeStore.getState().loadedVideoId).toBeNull();
  });

  it("☰の今日のメニューの行を押しても同じ確認が出て、キャンセルすると残る", () => {
    prepareUnsavedWork();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    fireEvent.press(screen.getByRole("button", { name: "メニューを開く" }));
    fireEvent.press(screen.getByRole("button", { name: /^イントロ、前回/ }));

    expect(alertSpy).toHaveBeenCalledWith(UNSAVED_TITLE, UNSAVED_MESSAGE, expect.any(Array));
    pressAlertButton(UNSAVED_TITLE, "キャンセル");
    expectWorkKept();
    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
  });

  it("今日のメニューから開いた直後（区間が保存済みフレーズと一致）は確認なしで閉じる", () => {
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    fireEvent.press(screen.getByRole("button", { name: "メニューを開く" }));
    fireEvent.press(screen.getByRole("button", { name: "動画を閉じる" }));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().loadedVideoId).toBeNull();
  });

  it("フレーズとして保存した直後は、保存の流れで切り替えの確認を出さない", async () => {
    act(() => {
      const store = usePracticeStore.getState();
      store.loadVideo(PHRASE.videoId, PHRASE.videoTitle);
      store.setDuration(300);
      store.setABLoop({ pointA: 83, pointB: 101, enabled: true });
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    const onSave = mockOnSave;
    if (!onSave) throw new Error("SavePhraseSheet が描画されていません");

    await act(async () => {
      await onSave({ name: "サビ", currentBpm: 90, targetBpm: 130 });
    });

    expect(alertSpy.mock.calls.map(([title]) => title)).toEqual(["保存しました"]);
    expect(usePracticeStore.getState().activePhrasePractice?.phrase.name).toBe("サビ");
  });
});

describe("PracticeTab: ABループの「×」", () => {
  it("保存していない有効な区間なら確認が出て、キャンセルすると区間が残る", () => {
    prepareUnsavedWork();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    act(() => mockOnClearLoop?.());

    expect(alertSpy).toHaveBeenCalledWith(
      "区間を解除しますか",
      "区間 01:23〜01:41はまだ保存されていません。解除すると失われます。",
      expect.any(Array),
    );
    pressAlertButton("区間を解除しますか", "キャンセル");
    expectWorkKept();
    pressAlertButton("区間を解除しますか", "解除する");
    expect(usePracticeStore.getState().abLoop).toEqual({ pointA: null, pointB: null, enabled: false });
  });

  it("A点だけなら確認なしで解除する", () => {
    act(() => {
      const store = usePracticeStore.getState();
      store.loadVideo(PHRASE.videoId, PHRASE.videoTitle);
      store.setABLoop({ pointA: 83 });
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    act(() => mockOnClearLoop?.());

    expect(alertSpy).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().abLoop.pointA).toBeNull();
  });

  it("保存済みフレーズと同じ区間なら確認なしで解除する", () => {
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    act(() => mockOnClearLoop?.());

    expect(alertSpy).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().abLoop.pointA).toBeNull();
  });
});
