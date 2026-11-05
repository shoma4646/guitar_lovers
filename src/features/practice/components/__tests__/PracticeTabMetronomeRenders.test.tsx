import { act, render } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { usePracticeStore } from "@/stores/practice";
import { useMetronomeBeatStore } from "@/stores/metronomeBeat";
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
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: () => {} }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "uuid" }));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light" },
}));
jest.mock("react-native-audio-api", () => ({
  AudioManager: { setAudioSessionOptions: jest.fn() },
  AudioContext: jest.fn().mockImplementation(() => ({
    get currentTime() {
      return Date.now() / 1000;
    },
    close: jest.fn(async () => {}),
  })),
}));
jest.mock("@/features/practice/lib/metronomeClick", () => ({ scheduleClick: jest.fn() }));
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
const mockAttempts: never[] = [];
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts }),
}));
const mockPhrases = [PHRASE];
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases }),
}));
const mockPresets: never[] = [];
jest.mock("@/features/practice/api/useVideoPresets", () => ({
  useVideoPresets: () => ({ data: mockPresets }),
}));
jest.mock("@/features/reminder/hooks/useReminderPermissionPrompt", () => ({
  useReminderPermissionPrompt: () => jest.fn(),
}));
jest.mock("@/features/practice/hooks/useSaveTimerSession", () => ({
  useSaveTimerSession: () => ({ saveTimerSession: jest.fn(), isSaving: false }),
}));
jest.mock("@/features/practice/hooks/useCloseVideo", () => ({ useCloseVideo: () => jest.fn() }));
jest.mock("@/features/practice/hooks/usePausePlayerOnBlur", () => ({ usePausePlayerOnBlur: () => {} }));
jest.mock("@/shared/hooks/useKeepAwakeWhileFocused", () => ({ useKeepAwakeWhileFocused: () => {} }));

const mockRenders = { tab: 0, player: 0, menuSheet: 0 };
jest.mock("../VideoPlayerCard", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    VideoPlayerCard: React.memo(
      React.forwardRef(function MockPlayer() {
        mockRenders.player += 1;
        return null;
      }),
    ),
  };
});
jest.mock("../PracticeMenuSheet", () => ({
  PracticeMenuSheet: () => {
    mockRenders.menuSheet += 1;
    return null;
  },
}));
// PracticeTab直下の子で memo されていないもの。PracticeTabが描き直されるたびに描画される
jest.mock("../PlaybackRateChips", () => ({
  PlaybackRateChips: () => {
    mockRenders.tab += 1;
    return null;
  },
}));
jest.mock("../PracticeControlPanel", () => ({ PracticeControlPanel: () => null }));
jest.mock("../PracticeSessionBar", () => ({ PracticeSessionBar: () => null }));
jest.mock("../PhraseResultSheet", () => ({ PhraseResultSheet: () => null }));
jest.mock("../SavePhraseSheet", () => ({ SavePhraseSheet: () => null }));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  usePracticeStore.setState(initialState, true);
  useMetronomeBeatStore.setState({ activeBeat: 0 });
  (Haptics.impactAsync as jest.Mock).mockClear();
  mockRenders.tab = 0;
  mockRenders.player = 0;
  mockRenders.menuSheet = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("PracticeTab のメトロノーム再生中の描き直し", () => {
  it("メトロノームの拍が進んでも、練習画面・動画プレイヤー・メニューシートは描き直されない", () => {
    act(() => {
      usePracticeStore.getState().startPhrasePractice(PHRASE, 85);
      // 練習タイマーの1秒ごとの描き直しを混ぜず、拍だけの影響を見る
      usePracticeStore.getState().stopPracticeTimer();
      usePracticeStore.getState().setMetronomeBpm(180);
      usePracticeStore.getState().setMetronomeEnabled(true);
    });
    render(<PracticeTab onOpenAddVideo={jest.fn()} />);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    const before = { ...mockRenders };
    const beatsBefore = (Haptics.impactAsync as jest.Mock).mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    // 180BPMで2秒 = 6拍
    expect((Haptics.impactAsync as jest.Mock).mock.calls.length - beatsBefore).toBe(6);
    expect(mockRenders).toEqual(before);
  });
});
