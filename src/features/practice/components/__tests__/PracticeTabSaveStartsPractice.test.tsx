import { act, render, screen } from "@testing-library/react-native";
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
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
const mockSavePhraseAsync = jest.fn(async (_phrase: PracticePhrase) => {});
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: mockSavePhraseAsync }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
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
const mockPromptReminder = jest.fn(async () => {});
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => mockPromptReminder,
}));
jest.mock("@/features/practice/hooks/usePhraseLongPressActions", () => ({
  usePhraseLongPressActions: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/useSaveTimerSession", () => ({
  useSaveTimerSession: () => ({ saveTimerSession: jest.fn(), isSaving: false }),
}));
jest.mock("@/features/practice/hooks/useCloseVideo", () => ({ useCloseVideo: () => jest.fn() }));
jest.mock("@/features/practice/hooks/usePausePlayerOnBlur", () => ({ usePausePlayerOnBlur: () => {} }));
jest.mock("@/features/practice/hooks/useMetronomeEngine", () => ({
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, activeBeat: -1, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
jest.mock("../VideoPlayerCard", () => ({ VideoPlayerCard: () => null }));
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));

jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
let mockOnSave: ((input: SavePhraseInput) => Promise<void>) | null = null;
jest.mock("../SavePhraseSheet", () => ({
  SavePhraseSheet: ({ onSave }: { onSave: (input: SavePhraseInput) => Promise<void> }) => {
    mockOnSave = onSave;
    return null;
  },
}));

const initialState = usePracticeStore.getState();
const INPUT: SavePhraseInput = { name: "サビ", currentBpm: 90, targetBpm: 130 };

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockSavePhraseAsync.mockClear();
  mockPromptReminder.mockClear();
  mockOnSave = null;
  jest.restoreAllMocks();
});

function prepareLoopOnLoadedVideo() {
  act(() => {
    const store = usePracticeStore.getState();
    store.loadVideo(PHRASE.videoId, PHRASE.videoTitle);
    store.setDuration(120);
    store.setABLoop({ pointA: 30, pointB: 40, enabled: true });
    store.addBookmark({ id: "b1", time: 35, label: "目印", createdAt: "2026-09-01T00:00:00.000Z" });
  });
}

async function save(input: SavePhraseInput = INPUT) {
  if (!mockOnSave) throw new Error("SavePhraseSheet が描画されていません");
  const onSave = mockOnSave;
  await act(async () => {
    await onSave(input);
  });
}

function alertButtons(title: string): AlertButton[] {
  const call = (Alert.alert as jest.Mock).mock.calls.find(([t]) => t === title);
  if (!call) throw new Error(`「${title}」のダイアログが出ていません`);
  return call[2] as AlertButton[];
}

describe("PracticeTab で区間をフレーズとして保存した直後", () => {
  it("そのまま練習中になり、回数0・目標BPMが保存時の現在BPMの練習中バーが出る", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    prepareLoopOnLoadedVideo();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /^1回弾いた/ })).toBeNull();

    await save();

    expect(screen.getByRole("button", { name: "1回弾いた、現在0/3回" })).toBeTruthy();
    const { activePhrasePractice, metronomeBpm } = usePracticeStore.getState();
    const saved = mockSavePhraseAsync.mock.calls[0][0];
    expect(activePhrasePractice).toMatchObject({ phrase: saved, goalBpm: 90, completedReps: 0 });
    expect(metronomeBpm).toBe(90);
  });

  it("保存の前後で動画は作り直されず、ブックマークも残る", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    prepareLoopOnLoadedVideo();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    const before = usePracticeStore.getState();

    await save();

    const after = usePracticeStore.getState();
    expect(after.videoLoadNonce).toBe(before.videoLoadNonce);
    expect(after.bookmarks).toEqual(before.bookmarks);
    expect(after.abLoop).toEqual(before.abLoop);
  });

  it("保存しましたのOKでリマインドの確認へ進む", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    prepareLoopOnLoadedVideo();
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);

    await save();
    act(() => {
      alertButtons("保存しました").find((b) => b.text === "OK")?.onPress?.();
    });

    expect(mockPromptReminder).toHaveBeenCalledTimes(1);
  });

  describe("別のフレーズを1回以上弾いている練習中に保存したとき", () => {
    function prepareActivePracticeWithReps() {
      act(() => {
        const store = usePracticeStore.getState();
        store.startPhrasePractice(PHRASE, 85);
        store.setDuration(120);
        store.incrementCompletedReps();
        store.setABLoop({ pointA: 30, pointB: 40, enabled: true });
      });
    }

    it("切り替えの確認を出し、「切り替える」で新しいフレーズの練習中になる", async () => {
      jest.spyOn(Alert, "alert").mockImplementation(() => {});
      prepareActivePracticeWithReps();
      render(<PracticeTab onOpenAddVideo={jest.fn()} />);

      await save();

      expect(mockSavePhraseAsync).toHaveBeenCalledTimes(1);
      expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe(PHRASE.id);
      act(() => {
        alertButtons("練習中の記録が消えます").find((b) => b.text === "切り替える")?.onPress?.();
      });

      const { activePhrasePractice } = usePracticeStore.getState();
      expect(activePhrasePractice?.phrase.name).toBe("サビ");
      expect(activePhrasePractice?.completedReps).toBe(0);
      expect(alertButtons("保存しました")).toBeTruthy();
    });

    it("「キャンセル」なら前のフレーズの回数を残し、保存できたことは知らせる", async () => {
      jest.spyOn(Alert, "alert").mockImplementation(() => {});
      prepareActivePracticeWithReps();
      render(<PracticeTab onOpenAddVideo={jest.fn()} />);

      await save();
      act(() => {
        alertButtons("練習中の記録が消えます").find((b) => b.text === "キャンセル")?.onPress?.();
      });

      const { activePhrasePractice } = usePracticeStore.getState();
      expect(activePhrasePractice?.phrase.id).toBe(PHRASE.id);
      expect(activePhrasePractice?.completedReps).toBe(1);
      expect(alertButtons("保存しました")).toBeTruthy();
    });
  });
});
