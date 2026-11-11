import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react-native";
import { createAppQueryClient } from "@/shared/lib/createAppQueryClient";
import {
  getPhraseAttempts,
  getPracticePhrases,
  savePracticePhrase,
} from "@/shared/services/storage";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

const GOAL_BPM = 85;
const MOCK_METRONOME_BPM = 80;

const PHRASE: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロ",
  startSec: 10,
  endSec: 20,
  currentBpm: 70,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
let mockUuidCount = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `uuid-${++mockUuidCount}` }));
jest.mock("@/features/practice/api/useAddRecentVideo", () => ({
  useAddRecentVideo: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
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
  useMetronomeEngine: () => ({ bpm: MOCK_METRONOME_BPM, enabled: false, beatsPerBar: 4 }),
}));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));
jest.mock("../VideoPlayerCard", () => ({ VideoPlayerCard: () => null }));
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
type SessionBarProps = { onFinish: () => void };
const mockSessionBar: { props: SessionBarProps | null } = { props: null };
jest.mock("../PracticeSessionBar", () => ({
  PracticeSessionBar: (props: SessionBarProps) => {
    mockSessionBar.props = props;
    return null;
  },
}));
type ResultSheetProps = {
  onClose: () => void;
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

function sessionBar(): SessionBarProps {
  if (!mockSessionBar.props) throw new Error("練習中バーが描画されていない");
  return mockSessionBar.props;
}

function resultSheet(): ResultSheetProps {
  if (!mockResultSheet.props) throw new Error("結果シートが描画されていない");
  return mockResultSheet.props;
}

const initialState = usePracticeStore.getState();
let queryClient: QueryClient;

beforeEach(async () => {
  await AsyncStorage.clear();
  usePracticeStore.setState(initialState, true);
  mockSessionBar.props = null;
  mockResultSheet.props = null;
  mockUuidCount = 0;
  queryClient = createAppQueryClient();
  // gcタイマーが残るとjestが終了しないため止める
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    queries: { ...defaults.queries, gcTime: Infinity },
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });
});

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
});

describe("PracticeTab の記録するBPM", () => {
  it("目標より低いメトロノームで「弾けた」を記録すると、記録とフレーズの現在BPMはメトロノームのBPMになる", async () => {
    await savePracticePhrase(PHRASE);

    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, GOAL_BPM);
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PracticeTab onOpenAddVideo={jest.fn()} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    act(() => sessionBar().onFinish());
    await act(async () => {
      await resultSheet().onSubmit({ result: "ok" }, "finish");
    });

    const attempts = await getPhraseAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].bpm).toBe(MOCK_METRONOME_BPM);
    expect((await getPracticePhrases())[0].currentBpm).toBe(MOCK_METRONOME_BPM);
  });
});
