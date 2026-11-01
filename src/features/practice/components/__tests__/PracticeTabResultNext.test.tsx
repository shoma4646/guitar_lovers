import { act, render } from "@testing-library/react-native";
import { Alert } from "react-native";
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
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn(async () => {}) }),
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
  useMetronomeEngine: () => ({ bpm: 85, enabled: false, activeBeat: -1, beatsPerBar: 4 }),
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
  it("フレーズが1本だけなら次の1本は無いと結果シートへ伝え、記録すると完了を知らせる", async () => {
    mockPhrases = [PHRASE];
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const props = startAndRender();

    expect(props.hasNextPhrase).toBe(false);
    await act(async () => {
      await props.onSubmit({ result: "partial" }, "finish");
    });

    expect(alertSpy).toHaveBeenCalledWith("記録しました", "今日のメニューで次に練習するフレーズはありません");
    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
    alertSpy.mockRestore();
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

  it("次の1本があるときに「今日は終わる」を選んでも、完了の案内は出さない", async () => {
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
