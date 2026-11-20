import { act, render } from "@testing-library/react-native";
import { buildTodayMenu } from "@/features/practice/lib/progression";
import { usePracticeStore } from "@/stores/practice";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";
import { PracticeTab } from "../PracticeTab";

const PHRASES: PracticePhrase[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `p${n}`,
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: `フレーズ${n}`,
  startSec: 10,
  endSec: 20,
  currentBpm: 80,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: `2026-09-0${n}T00:00:00.000Z`,
}));

jest.mock("@/features/practice/lib/progression", () => {
  const actual = jest.requireActual<typeof import("@/features/practice/lib/progression")>(
    "@/features/practice/lib/progression",
  );
  return { ...actual, buildTodayMenu: jest.fn(actual.buildTodayMenu) };
});
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
jest.mock("@/features/practice/api/useSavePracticePhrase", () => ({
  useSavePracticePhrase: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/features/practice/api/useRecordPhraseResult", () => ({
  useRecordPhraseResult: () => ({ mutateAsync: jest.fn(async () => {}) }),
}));
jest.mock("@/features/practice/api/useGraduatePracticePhrase", () => ({
  useGraduatePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useArchivePracticePhrase", () => ({
  useArchivePracticePhrase: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/features/practice/api/useDeletePracticePhrase", () => ({
  useDeletePracticePhrase: () => ({ mutate: jest.fn() }),
}));
const mockAttempts: PhraseAttempt[] = [];
jest.mock("@/features/practice/api/usePhraseAttempts", () => ({
  usePhraseAttempts: () => ({ data: mockAttempts, isLoading: false }),
}));
const mockPhrases = PHRASES;
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: mockPhrases, isLoading: false }),
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
jest.mock("../PracticeMenuSheet", () => ({ PracticeMenuSheet: () => null }));
jest.mock("../VideoPlayerCard", () => ({ VideoPlayerCard: () => null }));

const buildTodayMenuMock = buildTodayMenu as jest.MockedFunction<typeof buildTodayMenu>;
const initialState = usePracticeStore.getState();

function renderHome() {
  render(<PracticeTab onOpenAddVideo={jest.fn()} />);
  act(() => {
    jest.advanceTimersByTime(0);
  });
  buildTodayMenuMock.mockClear();
}

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("動画を開く前の練習画面での今日のメニューの組み直し", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 24, 12, 0) });
  });

  it("メトロノームのBPMを10回変えても今日のメニューを組み直さない", () => {
    renderHome();

    for (let i = 1; i <= 10; i++) {
      act(() => {
        usePracticeStore.getState().setMetronomeBpm(120 + i);
      });
    }

    expect(buildTodayMenuMock).not.toHaveBeenCalled();
  });

  it("練習タイマーが10秒進んでも今日のメニューを組み直さない", () => {
    renderHome();

    act(() => {
      usePracticeStore.getState().startPracticeTimer();
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(buildTodayMenuMock).not.toHaveBeenCalled();
  });
});

describe("日付が変わったときの今日のメニュー", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 24, 23, 59, 50) });
  });

  it("翌日の基準日で組み直す", () => {
    renderHome();

    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(buildTodayMenuMock).toHaveBeenCalled();
    const nextDay = new Date(2026, 8, 25).toDateString();
    for (const [, , now] of buildTodayMenuMock.mock.calls) {
      expect(now.toDateString()).toBe(nextDay);
    }
  });
});
