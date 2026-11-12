import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

function makePhrase(id: string, name: string, videoId: string): PracticePhrase {
  return {
    id,
    videoId,
    videoTitle: "テスト動画",
    name,
    startSec: 10,
    endSec: 20,
    currentBpm: 80,
    targetBpm: 120,
    playbackRate: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

const UNPLAYABLE = makePhrase("p1", "消えた動画のイントロ", "abc123def45");
const NEXT = makePhrase("p2", "ソロ", "zyx987wvu65");
let mockPhrases: PracticePhrase[] = [];

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
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: [] }),
}));
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
jest.mock("../VideoPlayerCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: React.forwardRef(function MockPlayer(_props: unknown, ref: React.Ref<unknown>) {
      React.useImperativeHandle(ref, () => ({ postMessage: () => {} }));
      return null;
    }),
  };
});
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
});

function renderUnplayablePractice() {
  act(() => {
    usePracticeStore.getState().startPhrasePractice(UNPLAYABLE, 85);
    usePracticeStore.getState().setPlayerError(150);
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
}

describe("PracticeTab で練習中のフレーズの動画が再生できないとき", () => {
  it("「次の1本へ」を押すと、今日のメニューの次のフレーズで練習を始める", () => {
    mockPhrases = [UNPLAYABLE, NEXT];
    renderUnplayablePractice();

    fireEvent.press(screen.getByRole("button", { name: "次の1本へ" }));

    const state = usePracticeStore.getState();
    expect(state.activePhrasePractice?.phrase.id).toBe("p2");
    expect(state.activePhrasePractice?.completedReps).toBe(0);
    expect(state.metronomeBpm).toBe(80);
    expect(state.loadedVideoId).toBe(NEXT.videoId);
    expect(state.playerError).toBeNull();
  });

  it("今日のメニューに次のフレーズが無ければ「次の1本へ」を出さない", () => {
    mockPhrases = [UNPLAYABLE];
    renderUnplayablePractice();

    expect(screen.getByRole("button", { name: "このフレーズを整理" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "次の1本へ" })).toBeNull();
  });
});
