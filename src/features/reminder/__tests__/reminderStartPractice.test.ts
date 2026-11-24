import { startPhrasePracticeFromReminder } from "@/features/reminder/components/ReminderBridge";
import { getPhraseAttempts, getPracticePhrases } from "@/shared/services/storage";
import { usePracticeStore } from "@/stores/practice";
import type { PhraseAttempt, PracticePhrase } from "@/shared/types/models";

const NOW = new Date(2026, 8, 24, 20, 0);

const clearedYesterday: PracticePhrase = {
  id: "p1",
  videoId: "abc123def45",
  videoTitle: "テスト動画",
  name: "イントロのリフ",
  startSec: 10,
  endSec: 20,
  initialBpm: 100,
  currentBpm: 100,
  targetBpm: 120,
  playbackRate: 1,
  createdAt: new Date(2026, 8, 1, 12).toISOString(),
  updatedAt: new Date(2026, 8, 23, 21).toISOString(),
};

const archived: PracticePhrase = {
  ...clearedYesterday,
  id: "p2",
  name: "アーカイブしたフレーズ",
  archivedAt: new Date(2026, 8, 22, 12).toISOString(),
};

const okAt100Yesterday: PhraseAttempt = {
  id: "a1",
  phraseId: "p1",
  date: new Date(2026, 8, 23, 21).toISOString(),
  bpm: 100,
  result: "ok",
};

jest.mock("@/shared/services/storage", () => ({
  getPracticePhrases: jest.fn(),
  getPhraseAttempts: jest.fn(),
}));
jest.mock("expo-notifications", () => ({}));
jest.mock("expo-router", () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({ syncReminder: jest.fn() }));
jest.mock("@/features/reminder/services/reminderSyncSubscription", () => ({
  subscribeReminderSync: jest.fn(),
}));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  usePracticeStore.setState(initialState, true);
  jest.mocked(getPracticePhrases).mockResolvedValue([archived, clearedYesterday]);
  jest.mocked(getPhraseAttempts).mockResolvedValue([okAt100Yesterday]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("通知タップで始める練習", () => {
  it("前日に到達BPMで弾けたフレーズは、前回の到達BPM（100）ではなく今日の目標（105）で始まる", async () => {
    await startPhrasePracticeFromReminder("p1");

    const state = usePracticeStore.getState();
    expect(state.activePhrasePractice?.phrase.id).toBe("p1");
    expect(state.activePhrasePractice?.goalBpm).toBe(105);
    expect(state.metronomeBpm).toBe(105);
  });

  it("アーカイブしたフレーズの通知からは練習を始めない", async () => {
    await startPhrasePracticeFromReminder("p2");

    expect(usePracticeStore.getState().activePhrasePractice).toBeNull();
  });
});
