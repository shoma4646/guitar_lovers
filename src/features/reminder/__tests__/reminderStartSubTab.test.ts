import { startPhrasePracticeFromReminder } from "@/features/reminder/components/ReminderBridge";
import { usePracticeStore } from "@/stores/practice";
import type { PracticePhrase } from "@/shared/types/models";

const mockPhrase: PracticePhrase = {
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
  createdAt: "2026-09-01T03:00:00.000Z",
  updatedAt: "2026-09-01T03:00:00.000Z",
};

jest.mock("@/shared/services/storage", () => ({
  getPracticePhrases: jest.fn(async () => [mockPhrase]),
  getPhraseAttempts: jest.fn(async () => []),
}));
jest.mock("expo-notifications", () => ({}));
jest.mock("expo-router", () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock("@/features/reminder/services/reminderScheduler", () => ({ syncReminder: jest.fn() }));
jest.mock("@/features/reminder/services/reminderSyncSubscription", () => ({
  subscribeReminderSync: jest.fn(),
}));

const initialState = usePracticeStore.getState();

beforeEach(() => {
  usePracticeStore.setState(initialState, true);
});

describe("通知タップで練習を始めたときの練習サブタブ", () => {
  it.each(["presets", "favorites"] as const)("%sを開いたままでもpracticeに戻る", async (subTab) => {
    usePracticeStore.getState().setPracticeSubTab(subTab);

    await startPhrasePracticeFromReminder("p1");

    const state = usePracticeStore.getState();
    expect(state.activePhrasePractice?.phrase.id).toBe("p1");
    expect(state.practiceSubTab).toBe("practice");
  });
});
