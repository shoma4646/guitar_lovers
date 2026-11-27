import { act, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
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
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn(async () => {}) }),
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
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
type ResultSheetProps = {
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

const SECOND: PracticePhrase = { ...PHRASE, id: "p2", name: "Aメロ" };

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockResultSheet.props = null;
});

function startAndRender() {
  act(() => {
    usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  const props = mockResultSheet.props;
  if (!props) throw new Error("結果シートが描画されていない");
  return props;
}

describe("PracticeTab の結果記録後の「次の1本」", () => {
  it("フレーズが1本だけなら次の1本は無いと結果シートへ伝え、記録するとモーダルを出さずに完了を読み上げる", async () => {
    mockPhrases = [PHRASE];
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const announceSpy = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
    const props = startAndRender();

    expect(props.hasNextPhrase).toBe(false);
    await act(async () => {
      await props.onSubmit({ result: "partial" }, "finish");
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(announceSpy).toHaveBeenCalledWith(
      "記録しました。今日のメニューで次に練習するフレーズはありません",
    );
    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    alertSpy.mockRestore();
    announceSpy.mockRestore();
  });

  it("次の1本があれば、記録して次へで次のフレーズの練習が始まり、完了の案内は出さない", async () => {
    mockPhrases = [PHRASE, SECOND];
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const props = startAndRender();

    expect(props.hasNextPhrase).toBe(true);
    await act(async () => {
      await props.onSubmit({ result: "partial" }, "next");
    });

    expect(usePracticeStore.getState().activePhrasePractice?.phrase.id).toBe("p2");
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("次の1本があるときに「今日は終わる」を選んでも、モーダルの案内は出さない", async () => {
    mockPhrases = [PHRASE, SECOND];
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const props = startAndRender();

    await act(async () => {
      await props.onSubmit({ result: "partial" }, "finish");
    });

    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe("PracticeTab の「記録して次の1本へ」の知らせ", () => {
  const NEXT_NOTICE = "記録しました。次は「Aメロ」、80 BPM";
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPhrases = [PHRASE, SECOND];
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    announceSpy.mockClear();
    jest.mocked(Haptics.notificationAsync).mockClear();
  });

  afterEach(() => {
    announceSpy.mockRestore();
    jest.useRealTimers();
  });

  it("記録できたことと次のフレーズ名・BPMを1回読み上げ、成功の振動を返す", async () => {
    const props = startAndRender();

    await act(async () => {
      await props.onSubmit({ result: "ok" }, "next");
    });

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith(NEXT_NOTICE);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it("動画を読み込んだ後の画面に同じ文言の帯を出し、4秒後に消す", async () => {
    jest.useFakeTimers();
    const props = startAndRender();

    await act(async () => {
      await props.onSubmit({ result: "ok" }, "next");
    });

    expect(usePracticeStore.getState().loadedVideoId).not.toBeNull();
    expect(screen.getByTestId("practice-video-header")).toBeTruthy();
    expect(screen.getByTestId("practice-finish-notice")).toHaveTextContent(NEXT_NOTICE);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByTestId("practice-finish-notice")).toBeNull();
  });

  it("読み上げるBPMは、メトロノームが実際に鳴らす範囲内の値", async () => {
    mockPhrases = [PHRASE, { ...SECOND, currentBpm: 300, targetBpm: 320 }];
    const props = startAndRender();

    await act(async () => {
      await props.onSubmit({ result: "ok" }, "next");
    });

    expect(usePracticeStore.getState().metronomeBpm).toBe(240);
    expect(announceSpy).toHaveBeenCalledWith("記録しました。次は「Aメロ」、240 BPM");
  });

  it("練習を始めただけでは帯を出さない", () => {
    startAndRender();

    expect(screen.queryByTestId("practice-finish-notice")).toBeNull();
  });
});
