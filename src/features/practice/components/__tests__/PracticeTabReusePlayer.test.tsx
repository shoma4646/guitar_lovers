import { act, render } from "@testing-library/react-native";
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
const mockPlayer = {
  mounts: 0,
  posted: [] as Record<string, unknown>[],
  onDurationReady: null as ((duration: number) => void) | null,
};
jest.mock("../VideoPlayerCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: React.forwardRef(function MockPlayer(
      props: { onDurationReady: (duration: number) => void },
      ref: React.Ref<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({
        postMessage: (data: string) => mockPlayer.posted.push(JSON.parse(data)),
      }));
      React.useEffect(() => {
        mockPlayer.mounts += 1;
      }, []);
      mockPlayer.onDurationReady = props.onDurationReady;
      return null;
    }),
  };
});
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const SAME_VIDEO_NEXT: PracticePhrase = { ...PHRASE, id: "p2", name: "ソロ", startSec: 30.9, endSec: 40, playbackRate: 0.75 };
const OTHER_VIDEO: PracticePhrase = { ...PHRASE, id: "p3", videoId: "zyx987wvu65", startSec: 5, endSec: 9 };

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
  mockPlayer.mounts = 0;
  mockPlayer.posted = [];
  mockPlayer.onDurationReady = null;
});

function renderReadyPlayer(phrase: PracticePhrase) {
  act(() => {
    usePracticeStore.getState().startPhrasePractice(phrase, 85);
  });
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  act(() => {
    mockPlayer.onDurationReady?.(200);
  });
}

describe("PracticeTab のプレイヤー再利用", () => {
  it("準備ができたら、秒単位に切り捨てずに小数のA点へシークする", () => {
    renderReadyPlayer({ ...PHRASE, startSec: 12.7, endSec: 20 });

    expect(mockPlayer.posted).toContainEqual({ action: "seek", time: 12.7 });
  });

  it("同じ動画の別フレーズへ進んでもプレイヤーを作り直さず、新しい区間・A点・速度を送って再生する", () => {
    renderReadyPlayer(PHRASE);
    const nonce = usePracticeStore.getState().videoLoadNonce;
    mockPlayer.posted = [];

    act(() => {
      usePracticeStore.getState().startPhrasePractice(SAME_VIDEO_NEXT, 90);
    });

    expect(usePracticeStore.getState().videoLoadNonce).toBe(nonce);
    expect(mockPlayer.mounts).toBe(1);
    expect(mockPlayer.posted).toContainEqual({ action: "setLoop", enabled: true, pointA: 30.9, pointB: 40 });
    expect(mockPlayer.posted).toContainEqual({ action: "seek", time: 30.9 });
    expect(mockPlayer.posted).toContainEqual({ action: "setRate", rate: 0.75 });
    expect(mockPlayer.posted).toContainEqual({ action: "play" });
    const setLoopIndex = mockPlayer.posted.findIndex((cmd) => cmd.action === "setLoop" && cmd.pointA === 30.9);
    const seekIndex = mockPlayer.posted.findIndex((cmd) => cmd.action === "seek" && cmd.time === 30.9);
    expect(setLoopIndex).toBeLessThan(seekIndex);
  });

  it("別の動画へ進むときは今までどおりプレイヤーを作り直す", () => {
    renderReadyPlayer(PHRASE);

    act(() => {
      usePracticeStore.getState().startPhrasePractice(OTHER_VIDEO, 90);
    });

    expect(mockPlayer.mounts).toBe(2);
  });

  it("練習画面ごと外れたら、プレイヤーは準備済みでなくなる", () => {
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
    });
    const { unmount } = render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    act(() => {
      mockPlayer.onDurationReady?.(200);
    });

    unmount();

    expect(usePracticeStore.getState().duration).toBe(0);
  });
});
