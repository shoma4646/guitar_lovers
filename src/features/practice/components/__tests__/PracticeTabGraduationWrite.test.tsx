import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
const mockRecordResult = jest.fn(async () => {});
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: mockRecordResult }),
}));
const mockUpdatePracticePhrase = jest.fn(async () => {});
jest.mock("@/shared/services/storage", () => ({
  ...jest.requireActual("@/shared/services/storage"),
  updatePracticePhrase: (...args: unknown[]) => mockUpdatePracticePhrase(...(args as [])),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
const mockPhrases: PracticePhrase[] = [PHRASE];
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
  useMetronomeEngine: () => ({ bpm: 120, enabled: false, beatsPerBar: 4 }),
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

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockResultSheet.props = null;
  mockRecordResult.mockClear();
  mockUpdatePracticePhrase.mockClear();
});

describe("PracticeTab で目標BPMに届いた結果を記録したときのフレーズへの書き込み", () => {
  it("記録の保存（recordPhraseResult）だけを行い、卒業日を別に書き込まない", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    // 既定のgcタイマーが残るとjestが終了しないため止める
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
    });
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 120);
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PracticeTab onOpenAddVideo={jest.fn()} />
      </QueryClientProvider>,
    );
    const props = mockResultSheet.props as ResultSheetProps | null;
    if (!props) throw new Error("結果シートが描画されていない");

    await act(async () => {
      await props.onSubmit({ result: "ok" }, "finish");
    });

    expect(mockRecordResult).toHaveBeenCalledTimes(1);
    expect(mockRecordResult).toHaveBeenCalledWith(
      expect.objectContaining({ phraseId: "p1", bpm: 120, result: "ok" }),
    );
    expect(mockUpdatePracticePhrase).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    queryClient.clear();
  });
});
