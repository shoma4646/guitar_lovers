import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Alert } from "react-native";
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
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
const mockRecordResult = jest.fn(async () => {});
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: mockRecordResult }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
let mockPhrases: PracticePhrase[] = [PHRASE];
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases }),
}));
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({ data: [] }),
}));
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => jest.fn(),
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
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
jest.mock("../VideoPlayerCard", () => ({ VideoPlayerCard: () => null }));
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
const mockSessionBar: { onFinish: (() => void) | null } = { onFinish: null };
jest.mock("../PracticeSessionBar", () => ({
  PracticeSessionBar: (props: { onFinish: () => void }) => {
    mockSessionBar.onFinish = props.onFinish;
    return null;
  },
}));
type ResultSheetProps = {
  visible: boolean;
  hasNextPhrase: boolean;
  onSubmit: (input: { result: "ok" | "partial" | "ng" }, action: "next" | "finish") => Promise<void>;
};
const mockResultSheet: { props: ResultSheetProps | null } = { props: null };
jest.mock("../PhraseResultSheet", () => ({
  PhraseResultSheet: (props: ResultSheetProps) => {
    mockResultSheet.props = props;
    return null;
  },
}));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));
jest.mock("../TodayPickCard", () => ({
  TodayPickCard: () => {
    const { Text: MockText } = jest.requireActual("react-native");
    return <MockText>今日の1本</MockText>;
  },
}));
jest.mock("../TodayPhraseRows", () => ({ TodayPhraseRows: () => null }));
jest.mock("../AllPhrasesSheet", () => ({ AllPhrasesSheet: () => null }));

const SECOND: PracticePhrase = { ...PHRASE, id: "p2", name: "Aメロ" };

const initialState = usePracticeStore.getState();
let alertSpy: jest.SpyInstance;
let announceSpy: jest.SpyInstance;

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockResultSheet.props = null;
  mockSessionBar.onFinish = null;
  mockRecordResult.mockReset();
  mockRecordResult.mockImplementation(async () => {});
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
  announceSpy.mockRestore();
});

function startAndRender() {
  act(() => {
    usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  act(() => {
    mockSessionBar.onFinish?.();
  });
  const props = mockResultSheet.props;
  if (!props?.visible) throw new Error("結果シートが開いていない");
  return props;
}

describe("PracticeTab の「記録して今日は終わる」の着地", () => {
  it.each([
    { label: "次の1本がある", phrases: [PHRASE, SECOND] },
    { label: "次の1本が無い", phrases: [PHRASE] },
  ])("$label日でも、動画を閉じて今日の練習画面へ戻り、完了を1回読み上げる", async ({ phrases }) => {
    mockPhrases = phrases;
    const props = startAndRender();
    expect(usePracticeStore.getState().abLoop.enabled).toBe(true);

    await act(async () => {
      await props.onSubmit({ result: "ok" }, "finish");
    });

    const state = usePracticeStore.getState();
    expect(state.loadedVideoId).toBeNull();
    expect(state.abLoop.enabled).toBe(false);
    expect(screen.getByText("今日の1本")).toBeTruthy();
    expect(screen.getByTestId("practice-finish-notice")).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy.mock.calls[0][0]).toContain("記録しました");
  });

  it("完了表示はしばらくすると消える", async () => {
    jest.useFakeTimers();
    try {
      mockPhrases = [PHRASE, SECOND];
      const props = startAndRender();
      await act(async () => {
        await props.onSubmit({ result: "ok" }, "finish");
      });
      expect(screen.getByTestId("practice-finish-notice")).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.queryByTestId("practice-finish-notice")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("記録に失敗したら動画を閉じず、練習状態と結果シートを保つ", async () => {
    mockPhrases = [PHRASE, SECOND];
    mockRecordResult.mockImplementation(async () => {
      throw new Error("保存失敗");
    });
    const props = startAndRender();

    await act(async () => {
      await props.onSubmit({ result: "ok" }, "finish");
    });

    const state = usePracticeStore.getState();
    expect(state.loadedVideoId).toBe(PHRASE.videoId);
    expect(state.activePhrasePractice?.phrase.id).toBe("p1");
    expect(mockResultSheet.props?.visible).toBe(true);
    expect(announceSpy).not.toHaveBeenCalled();
  });
});
